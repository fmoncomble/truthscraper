// Background service worker for TruthScraper (handles OAuth)
chrome.webNavigation.onCommitted.addListener(
	(evt) => {
		if (evt.frameId !== 0) {
			return;
		}

		let transitionType = evt.transitionType;

		const result = {
			url: evt.url,
			time: new Date().toISOString(),
			tabId: evt.tabId,
			type: transitionType,
		};

		// Persist the updated stats.
		if (transitionType === "form_submit") {
			chrome.tabs.update(evt.tabId, {
				url: "https://truthsocial.com/",
			});
		}
	},
	{ url: [{ urlEquals: "https://truthsocial.com/api/v1/trends" }] }
);

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message && message.action === "startAuth") {
		(async () => {
			try {
				const instance = message.instance || "truthsocial.com";
				let redirectUri;
				const userAgent = navigator.userAgent;
				if (userAgent.indexOf("Chrome") > -1) {
					redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
				} else if (userAgent.indexOf("Firefox") > -1) {
					redirectUri = browser.identity.getRedirectURL();
				}

				// Create app on instance
				const createAppUrl = `https://${instance}/api/v1/apps`;
				const resp = await fetch(createAppUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						client_name: "TruthScraper",
						redirect_uris: redirectUri,
						scopes: "read",
						website: redirectUri,
					}),
				});
				if (!resp.ok) {
					const err = await resp.text();
					sendResponse({
						success: false,
						error: "create_app_failed",
						detail: err,
					});
					return;
				}
				const data = await resp.json();
				const clientId = data.client_id;
				const clientSecret = data.client_secret;
				await chrome.storage.local.set({
					tsclientid: clientId,
					tsclientsecret: clientSecret,
				});

				const authUrl = `https://${instance}/oauth/authorize?client_id=${encodeURIComponent(
					clientId
				)}&response_type=code&redirect_uri=${encodeURIComponent(
					redirectUri
				)}&scope=read`;

				chrome.identity.launchWebAuthFlow(
					{ url: authUrl, interactive: true },
					async (redirectUrl) => {
						if (chrome.runtime.lastError || !redirectUrl) {
							sendResponse({
								success: false,
								error: "auth_failed",
								detail: chrome.runtime.lastError,
							});
							return;
						}
						try {
							const urlParams = new URLSearchParams(
								new URL(redirectUrl).search
							);
							const code = urlParams.get("code");
							const tokenResp = await fetch(
								`https://${instance}/oauth/token`,
								{
									method: "POST",
									headers: {
										"Content-Type":
											"application/x-www-form-urlencoded",
									},
									body: new URLSearchParams({
										client_id: clientId,
										client_secret: clientSecret,
										grant_type: "authorization_code",
										code: code,
										redirect_uri: redirectUri,
									}),
								}
							);
							const tokenData = await tokenResp.json();
							const userToken = tokenData.access_token;
							await chrome.storage.local.set({
								mastousertoken: userToken,
							});
							sendResponse({ success: true, token: userToken });
						} catch (e) {
							sendResponse({
								success: false,
								error: "token_exchange_failed",
								detail: e.toString(),
							});
						}
					}
				);
			} catch (e) {
				sendResponse({
					success: false,
					error: "exception",
					detail: e.toString(),
				});
			}
		})();
		// Return true to indicate we'll respond asynchronously
		return true;
	}
});
