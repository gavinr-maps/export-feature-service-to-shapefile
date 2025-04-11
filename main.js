import Portal from "@arcgis/core/portal/Portal.js";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo.js";
import esriId from "@arcgis/core/identity/IdentityManager.js";
import esriRequest from "@arcgis/core/request.js";
// import * as geoprocessor from "@arcgis/core/rest/geoprocessor.js";

const oAuthOptions = {
  // https://prof-services.maps.arcgis.com/home/item.html?id=bd2f2c00808747c2a5bee10040f0cc31#overview
  appId: "5zExhoFVwOyHuQaL",
  // portalUrl: "https://prof-services.maps.arcgis.com", // INCLUDE IF USING ARCGIS ENTERPRISE!
  popup: false,
};

const checkSignIn = async (portalUrl) => {
  try {
    const credential = await esriId.checkSignInStatus(portalUrl + "/sharing");
    const portal = new Portal({
      authMode: "immediate",
    });

    await portal.load();
    return [portal, credential];
  } catch (E) {
    console.log("NOT SIGNED IN - SHOW LOGIN BUTTON");
    return false;
  }
};

const signOut = () => {
  esriId.destroyCredentials();
  window.location.reload();
};
const signIn = async (portalUrl) => {
  // If the user is not signed in, generate a new credential.
  await esriId.getCredential(portalUrl + "/sharing", {
    oAuthPopupConfirmation: false,
  });

  await updateUI(portalUrl);
};

const updateUI = async (portalUrl) => {
  const signInResult = await checkSignIn(portalUrl);

  if (signInResult) {
    loginButtonWrapper.classList.add("hidden");
    wrapper.classList.remove("hidden");
  }
};

const exportToFile = async (portal, itemId, exportFormat) => {
  const requestOptions = {
    responseType: "json",
    method: "post",
    query: {
      f: "json",
      title: `Export of Item ${itemId} (${exportFormat})`,
      itemId,
      exportFormat,
    },
  };

  // would rather use geoprocessor.submitJob from the JS API, but does
  // not work with this specific endpoint....
  // const result = await geoprocessor.submitJob(
  //   `${portal.restUrl}/content/users/${portal.user.username}/export`,
  //   requestOptions.query
  // );
  // console.log("result", result);

  const submitResult = await esriRequest(
    `${portal.restUrl}/content/users/${portal.user.username}/export`,
    requestOptions
  );
  console.log("submitResult", submitResult);

  let result = {
    status: "processing",
  };
  do {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const res = await esriRequest(
      `${portal.restUrl}/content/users/${portal.user.username}/items/${submitResult.data.exportItemId}/status`,
      {
        responseType: "json",
        method: "post",
        query: {
          f: "json",
          jobId: submitResult.data.jobId,
          jobType: "export",
        },
      }
    );
    result = res.data;

    results.innerHTML = `<h2 class="underline clear-both">Results</h2>Processing: <br /><pre class="w-full overflow-auto">${new Date()} - ${JSON.stringify(
      res
    )}</pre>`;

    // query https://ps-dbs.maps.arcgis.com/sharing/rest/content/users/gavinrehkemperPS/items/c4def0011d29461ba7aed4997a545c2c/status
  } while (result && result.status && result.status === "processing");

  console.log("DONE:", result);

  return result;
};

const main = async () => {
  const info = new OAuthInfo(oAuthOptions);
  esriId.registerOAuthInfos([info]);

  await updateUI(info.portalUrl);

  // // When the login button is clicked, start the login process:
  loginButton.addEventListener("click", () => {
    signIn(info.portalUrl);
  });

  logoutButton.addEventListener("click", () => {
    signOut();
  });

  // When the "create service" button is clicked, create the feature service
  exportButton.addEventListener("click", async () => {
    const signInResult = await checkSignIn(info.portalUrl);
    if (signInResult && itemIdInput.value !== "") {
      // createFS(portal, itemIdInput.value);
      const [portal, credential] = signInResult;

      const result = await exportToFile(
        portal,
        itemIdInput.value,
        exportTypeInput.value
      );
      const downloadUrl = `${portal.restUrl}/content/items/${result.itemId}/data?token=${credential.token}`;
      results.innerHTML = `<h2 class="underline clear-both">Results</h2>Created item: <a target="_blank" class="underline" href="${portal.url}/home/item.html?id=${result.itemId}?token=${credential.token}">Item</a><br />
        Download: <a target="_blank" class="underline" href="${downloadUrl}">Click here</a><br />
        `;
      window.open(downloadUrl);
    } else {
      console.error("Invalid inputs.");
    }
  });
};

main();
