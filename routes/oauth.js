const express = require("express");
const axios = require("axios");
const router = express.Router();
const supabase = require("../db/connection");
require("dotenv").config();

// GHL redirects here after the user installs the app and authorizes it.
router.get("/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Missing authorization code.");
  }

  let tokenData;
  try {
    const tokenResponse = await axios.post(
      "https://services.leadconnectorhq.com/oauth/token",
      new URLSearchParams({
        client_id: process.env.GHL_CLIENT_ID,
        client_secret: process.env.GHL_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.GHL_REDIRECT_URI,
        user_type: "Location",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    tokenData = tokenResponse.data;
  } catch (err) {
    console.error("Token exchange error:", err.response?.data || err.message);
    return res
      .status(500)
      .send(
        "Something went wrong during installation. Please try again or contact support.",
      );
  }

  const {
    access_token,
    refresh_token,
    expires_in,
    locationId,
    companyId,
    userType,
  } = tokenData;

  // GHL defaults new apps to "bulk installation" mode, which means even a single-location
  // install can return a Company-level token with no locationId in this first response.
  // When that happens, look up which location was actually installed, then mint a
  // location-scoped token for it via /oauth/locationToken.
  if (!locationId && userType === "Company" && companyId) {
    let resolvedLocationId;
    try {
      const appId = process.env.GHL_CLIENT_ID.split("-")[0];
      const locationsResponse = await axios.get(
        "https://services.leadconnectorhq.com/oauth/installedLocations",
        {
          params: { companyId, appId, isInstalled: true },
          headers: {
            Authorization: `Bearer ${access_token}`,
            Version: "2021-07-28",
            Accept: "application/json",
          },
        },
      );
      const locations = locationsResponse.data?.locations || [];
      if (!locations.length) {
        console.error("No installed locations found for company:", companyId);
        return res
          .status(400)
          .send("Install did not return a location. Please contact support.");
      }
      resolvedLocationId = locations[0]._id || locations[0].locationId;
    } catch (err) {
      console.error(
        "Error fetching installed locations:",
        err.response?.data || err.message,
      );
      return res
        .status(500)
        .send(
          "Something went wrong resolving your location. Please contact support.",
        );
    }

    let locationTokenData;
    try {
      const locationTokenResponse = await axios.post(
        "https://services.leadconnectorhq.com/oauth/locationToken",
        new URLSearchParams({ companyId, locationId: resolvedLocationId }),
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            Version: "2021-07-28",
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
        },
      );
      locationTokenData = locationTokenResponse.data;
    } catch (err) {
      console.error(
        "Error minting location token:",
        err.response?.data || err.message,
      );
      return res
        .status(500)
        .send(
          "Something went wrong finalizing your install. Please contact support.",
        );
    }

    const expiresAt = new Date(
      Date.now() + locationTokenData.expires_in * 1000,
    ).toISOString();

    const { error } = await supabase.from("installs").upsert(
      {
        location_id: resolvedLocationId,
        company_id: companyId,
        access_token: locationTokenData.access_token,
        refresh_token: locationTokenData.refresh_token,
        token_expires_at: expiresAt,
      },
      { onConflict: "location_id" },
    );

    if (error) {
      console.error("Supabase error saving install:", error.message);
      return res
        .status(500)
        .send(
          "Something went wrong saving the install. Please contact support.",
        );
    }

    return res.send(`
  <html>
    <body style="font-family:sans-serif;text-align:center;padding:60px 20px;">
      <h2>✅ Installed successfully</h2>
      <p>Go back to your GHL sub-account and click <strong>ProjectScoutIQ</strong> in the left menu to get started.</p>
      <p style="color:#6b7280;font-size:13px;">You can close this tab.</p>
    </body>
  </html>
`);
  }

  if (!locationId) {
    console.error("No locationId returned from token exchange:", tokenData);
    return res
      .status(400)
      .send("Install did not return a location. Please contact support.");
  }

  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  const { error } = await supabase.from("installs").upsert(
    {
      location_id: locationId,
      company_id: companyId || null,
      access_token,
      refresh_token,
      token_expires_at: expiresAt,
    },
    { onConflict: "location_id" },
  );

  if (error) {
    console.error("Supabase error saving install:", error.message);
    return res
      .status(500)
      .send("Something went wrong saving the install. Please contact support.");
  }

  res.send(`
  <html>
    <body style="font-family:sans-serif;text-align:center;padding:60px 20px;">
      <h2>✅ Installed successfully</h2>
      <p>Go back to your GHL sub-account and click <strong>ProjectScoutIQ</strong> in the left menu to get started.</p>
      <p style="color:#6b7280;font-size:13px;">You can close this tab.</p>
    </body>
  </html>
`);
});

module.exports = router;
