// document.addEventListener('DOMContentLoaded', async function () {
window.onload = async function () {
	console.log("TS Scraper loaded");
	chrome.runtime.onMessage.addListener(
		async (message, sender, sendResponse) => {
			if (message.action === "scrape") {
				const dialog = document.createElement("dialog");
				dialog.classList.add("ts-scraper-dialog");
				const dialogHtmlUrl = chrome.runtime.getURL("ts_scraper.html");
				const dialogRes = await fetch(dialogHtmlUrl);
				if (!dialogRes.ok) {
					console.error("Failed to fetch dialog HTML");
					return;
				}
				const dialogHtml = await dialogRes.text();
				dialog.innerHTML = dialogHtml;
				document.body.appendChild(dialog);
				dialog.showModal();
				sendResponse({ success: true });
				const authContainer = dialog.querySelector("#auth-container");
				const authFold = dialog.querySelector("#auth-fold");
				const authUnfold = dialog.querySelector("#auth-unfold");
				const instSpan = dialog.querySelector("#instructions");
				const instDiv = dialog.querySelector("#instructions-container");
				const instanceContainer = dialog.querySelector(
					"#instance-container"
				);
				const instanceSaveBtn = dialog.querySelector("#instance-save");
				const allDone = dialog.querySelector("#all-done");
				const resetAuthBtn = dialog.querySelector("#reset-auth");
				const searchFold = dialog.querySelector("#search-fold");
				const searchUnfold = dialog.querySelector("#search-unfold");
				const searchContainer =
					dialog.querySelector("#search-container");
				const searchModeSelect = dialog.querySelector("#search-mode");
				const guidedSearchDiv = dialog.querySelector("#guided-search");
				const expertSearchDiv = dialog.querySelector("#expert-search");
				const keywordsInput = dialog.querySelector("#keywords");
				const allWordsInput = dialog.querySelector("#all-words");
				const anyWordsInput = dialog.querySelector("#any-words");
				const thisPhraseInput = dialog.querySelector("#this-phrase");
				const noWordsInput = dialog.querySelector("#no-words");
				const langDiv = dialog.querySelector("#language-div");
				const langInput = dialog.querySelector("#lang");
				const userDiv = dialog.querySelector("#user-div");
				const accountInput = dialog.querySelector("#account");
				const fromDateInput = dialog.querySelector("#from-date");
				const toDateInput = dialog.querySelector("#to-date");
				const searchBtn = dialog.querySelector("#search-btn");
				const searchMsg = dialog.querySelector("#search-msg");
				const noResult = dialog.querySelector("#no-result");
				const extractContainer =
					dialog.querySelector("#extract-container");
				const maxTootsInput = dialog.querySelector("#max-toots");
				const extractBtn = dialog.querySelector("#extract-btn");
				const extractSpinner = dialog.querySelector("#extract-spinner");
				const abortBtn = dialog.querySelector("#abort-btn");
				const resultsContainer =
					dialog.querySelector("#results-container");
				const resultsMsg = dialog.querySelector("#results-msg");
				const resetBtn = dialog.querySelector("#reset-btn");
				const dlResult = dialog.querySelector("#dl-result");
				const notice = dialog.querySelector("#notice");
				const dismissBtn = dialog.querySelector("#dismiss");
				const dlDialog = dialog.querySelector("#dl-dialog");
				const anonymizeCheckbox =
					dialog.querySelector("input#anonymize");
				const formatSelect = dialog.querySelector("#format-select");
				const dlConfirmBtn = dialog.querySelector("#dl-confirm-btn");

				const closeBtn = dialog.querySelector(".close-btn");
				closeBtn.addEventListener("click", () => {
					dialog.close();
					dialog.remove();
				});

				const version = chrome.runtime.getManifest().version;
				dialog.querySelector("#version-div").textContent =
					"v" + version;

				const logoUrl = chrome.runtime.getURL("icons/truth-logo.svg");
				dialog.querySelector(".ts-logo img").src = logoUrl;

				// Declare credentials
				let tsInstance = "truthsocial.com";
				let clientId;
				let clientSecret;
				chrome.storage.local.get(["tsclientid"], (result) => {
					clientId = result.tsclientid;
				});
				chrome.storage.local.get(["tsclientsecret"], (result) => {
					clientSecret = result.tsclientsecret;
				});

				// Manage notice
				let understand;
				let userToken;

				//Functions to handle user token
				getUserToken(function (userTokenResult) {
					userToken = userTokenResult;

					if (userToken) {
						instSpan.style.display = "none";
						instDiv.style.display = "none";
						instanceContainer.style.display = "none";
						allDone.style.display = "block";
						searchContainer.style.display = "block";
						searchFold.style.display = "block";
						searchUnfold.style.display = "none";
						verifyApp(userToken);
					} else {
						authContainer.style.display = "block";
						authFold.style.display = "block";
						authUnfold.style.display = "none";
						searchContainer.style.display = "none";
						searchFold.style.display = "none";
						searchUnfold.style.display = "block";
					}
				});

				function getUserToken(callback) {
					chrome.storage.local.get(
						["mastousertoken"],
						function (result) {
							const mastousertoken = result.mastousertoken || "";
							callback(mastousertoken);
						}
					);
				}

				async function verifyApp(token) {
					const url =
						"https://" +
						tsInstance +
						"/api/v1/apps/verify_credentials";
					const headers = {
						Authorization: "Bearer " + token,
					};
					const response = await fetch(url, { headers });
					if (response.status === 403) {
						if (
							window.confirm(
								"You have been temporarily blocked: click OK to reset your access and try again"
							)
						) {
							window.location.href =
								"https://truthsocial.com/api/v1/trends";
						}
					} else if (!response.ok) {
						if (response.status === 429) {
							window.alert(
								"You are being rate limited. Please wait and try again later."
							);
						} else {
							window.alert(
								"There was an error while verifying your authorization. Please reset your authentication."
							);
							authContainer.style.display = "block";
							authFold.style.display = "block";
							authUnfold.style.display = "none";
							searchContainer.style.display = "none";
							searchFold.style.display = "none";
							searchUnfold.style.display = "block";
						}
					}
				}

				async function saveUserToken() {
					chrome.storage.local.set(
						{ mastousertoken: userToken },
						function () {
							allDone.style.display = "block";
							instSpan.style.display = "none";
							instDiv.style.display = "none";
							instanceContainer.style.display = "none";
							setTimeout(() => {
								authContainer.style.display = "none";
								authFold.style.display = "none";
								authUnfold.style.display = "block";
								searchContainer.style.display = "block";
								searchFold.style.display = "block";
								searchUnfold.style.display = "none";
							}, 1000);
						}
					);
				}

				async function removeUserToken() {
					const formData = new FormData();
					formData.append("client_id", clientId);
					formData.append("client_secret", clientSecret);
					formData.append("token", userToken);

					const url = "https://" + tsInstance + "/oauth/revoke";

					try {
						const response = await fetch(url, {
							method: "POST",
							body: formData,
						});
						if (!response.ok) {
							window.alert(
								"Could not revoke authorization: server responded with error " +
									response.status
							);
							throw new Error(
								"Could not revoke token: ",
								response.status
							);
						} else {
							window.alert("Authorization successfully revoked");
						}
					} catch (error) {
						console.error("Error: ", error);
					}
					chrome.storage.local.remove("mastousertoken", function () {
						userToken = null;
					});
				}

				// Functions to handle notice
				getUnderstand(function (understandResult) {
					understand = understandResult;
					if (userToken && understand) {
						notice.style.display = "none";
					} else {
						notice.style.display = "block";
					}
				});

				function getUnderstand(callback) {
					chrome.storage.local.get(["understand"], function (result) {
						const understand = result.understand || "";
						callback(understand);
					});
				}

				async function saveUnderstand() {
					chrome.storage.local.set(
						{ understand: "understand" },
						function () {
							notice.style.display = "none";
						}
					);
				}

				async function removeUnderstand() {
					chrome.storage.local.remove("understand", function () {
						notice.style.display = "block";
					});
				}

				dismissBtn.addEventListener("click", () => {
					saveUnderstand();
				});

				// Assign role to Authentication header
				authFold.addEventListener("click", () => {
					if (authContainer.style.display === "block") {
						authContainer.style.display = "none";
						authFold.style.display = "none";
						authUnfold.style.display = "block";
					}
				});

				authUnfold.addEventListener("click", () => {
					if (authContainer.style.display === "none") {
						authContainer.style.display = "block";
						authFold.style.display = "block";
						authUnfold.style.display = "none";
					}
				});

				// Assign role to Instructions header
				instSpan.addEventListener("click", () => {
					if (instDiv.style.display === "none") {
						instDiv.style.display = "block";
						instSpan.textContent = "Hide instructions";
					} else if (instDiv.style.display === "block") {
						instDiv.style.display = "none";
						instSpan.textContent = "Show instructions";
					}
				});

				// Assign role to 'Build search query' header
				searchFold.addEventListener("click", () => {
					searchContainer.style.display = "none";
					searchFold.style.display = "none";
					searchUnfold.style.display = "block";
				});

				searchUnfold.addEventListener("click", () => {
					searchContainer.style.display = "block";
					searchFold.style.display = "block";
					searchUnfold.style.display = "none";
				});

				instanceSaveBtn.addEventListener("click", () => {
					authenticate();
				});

				// Oauth flow function
				async function authenticate() {
					let instance = tsInstance;
					let redirectUri = "https://truthsocial.com";
					let createAppUrl = `https://${instance}/api/v1/apps`;
					let response = await fetch(createAppUrl, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							client_name: "TruthScraper",
							redirect_uris: redirectUri,
							scopes: "read",
							website: redirectUri,
						}),
					});
					if (!response.ok) {
						let errorData = await response.json();
						console.error(
							"Error creating app: ",
							response.status,
							errorData
						);
						return;
					} else if (response && response.ok) {
						let data = await response.json();
						clientId = data.client_id;
						chrome.storage.local.set({ tsclientid: clientId });
						clientSecret = data.client_secret;
						chrome.storage.local.set({
							tsclientsecret: clientSecret,
						});
					}
					chrome.runtime.sendMessage(
						{ action: "startAuth", instance: instance },
						(response) => {
							if (!response) {
								console.error(
									"No response from background for auth"
								);
								return;
							}
							if (response.success) {
								userToken = response.token;
								saveUserToken();
							} else {
								console.error("Auth failed", response);
								window.alert(
									"Authentication failed (see console for details). Try again later or use a VPN."
								);
							}
						}
					);
				}

				// Reset authentication button
				resetAuthBtn.addEventListener("click", async () => {
					await removeUserToken();
					removeUnderstand();
					instanceContainer.style.display = "block";
					allDone.style.display = "none";
					searchContainer.style.display = "none";
					location.reload();
				});

				// Logic to build query URL from inputs
				let queryUrl;
				let lang;
				accountInput.addEventListener("change", () => {
					accountInput.removeAttribute("style");
				});

				let fromDate;
				let min_id;
				fromDateInput.addEventListener("change", () => {
					fromDate = new Date(fromDateInput.value);
					const fromDateStamp = BigInt(fromDate.getTime() / 1000);
					min_id = (fromDateStamp << 16n) * 1000n;
				});

				let toDate;
				let max_id;
				toDateInput.addEventListener("change", () => {
					toDate = new Date(toDateInput.value);
					const toDateStamp = BigInt(toDate.getTime() / 1000);
					max_id = (toDateStamp << 16n) * 1000n;
				});

				let searchMode = "guided";

				searchModeSelect.addEventListener("change", () => {
					searchMode = searchModeSelect.value;
					if (searchMode === "guided") {
						guidedSearchDiv.style.display = "block";
						expertSearchDiv.style.display = "none";
						langDiv.style.display = "block";
						userDiv.style.display = "none";
					} else if (searchMode === "expert") {
						guidedSearchDiv.style.display = "none";
						expertSearchDiv.style.display = "block";
						langDiv.style.display = "block";
						userDiv.style.display = "none";
					} else if (searchMode === "user") {
						guidedSearchDiv.style.display = "none";
						expertSearchDiv.style.display = "none";
						langDiv.style.display = "none";
						userDiv.style.display = "block";
						accountInput.focus();
					}
				});

				async function buildQueryUrl() {
					queryUrl = "https://" + tsInstance + "/api/v2/search?";

					// Concatenate query URL from search elements
					let keywords = keywordsInput.value;
					let allWords = allWordsInput.value.replaceAll(" ", " AND ");
					let anyWords = anyWordsInput.value.replaceAll(" ", " OR ");
					let thisPhrase = thisPhraseInput.value;
					let noWords = noWordsInput.value.replaceAll(" ", " OR ");
					lang = langInput.value;
					let account = accountInput.value.replaceAll(" ", " AND ");
					if (fromDate) {
					}
					if (searchMode === "expert") {
						keywords = `(${keywords})`;
						queryUrl = queryUrl + "q=" + keywords;
					} else if (searchMode === "guided") {
						if (allWords || anyWords || thisPhrase) {
							queryUrl = queryUrl + "q=";
						}
						if (allWords) {
							queryUrl = queryUrl + `(${allWords})`;
						}
						if (anyWords) {
							if (allWords) {
								queryUrl = queryUrl + " AND ";
							}
							queryUrl = queryUrl + `(${anyWords})`;
						}
						if (thisPhrase) {
							if (allWords || anyWords) {
								queryUrl = queryUrl + " AND ";
							}
							queryUrl = queryUrl + '("' + thisPhrase + '")';
						}
						if (noWords) {
							if (allWords || anyWords || thisPhrase) {
								queryUrl = queryUrl + " NOT ";
							}
							queryUrl = queryUrl + `(${noWords})`;
						}
					}
					if (searchMode === "user" && account) {
						try {
							getIdUrl =
								"https://" +
								tsInstance +
								"/api/v1/accounts/lookup?acct=" +
								account;
							const idResponse = await fetch(getIdUrl);
							if (idResponse.ok) {
								const idData = await idResponse.json();
								account = idData.id;
							} else {
								if (idResponse.status === 403) {
									if (
										window.confirm(
											"You have been temporarily blocked: click OK to reset your access and try again"
										)
									) {
										window.location.href =
											"https://truthsocial.com/api/v1/trends";
									}
								}
								window.alert("Account not found");
								searchMsg.style.display = "none";
								accountInput.style.outline =
									"solid 2px #e60000";
								accountInput.style.border = "solid 1px #e60000";
								accountInput.focus();
								return;
							}
							if (allWords || anyWords || thisPhrase) {
								queryUrl = queryUrl + "&";
							}
							queryUrl = queryUrl + "account_id=" + account;
						} catch (error) {
							console.error(error);
						}
					}
					if (searchMode === "user") {
						const excludeReplies =
							dialog.querySelector("#exclude-replies").checked;
						const excludeReposts =
							dialog.querySelector("#exclude-reposts").checked;
						queryUrl = `https://truthsocial.com/api/v1/accounts/${account}/statuses?exclude_replies=${excludeReplies}&exclude_reposts=${excludeReposts}&limit=40`;
					} else {
						queryUrl =
							queryUrl + "&type=statuses&resolve=true&limit=40";
					}
					if (fromDate) {
						if (searchMode === "user") {
							queryUrl += "&since_id=" + min_id;
						} else if (searchMode !== "user") {
							if (allWords || anyWords || thisPhrase) {
								queryUrl = queryUrl + "&";
							}
							queryUrl = queryUrl + "min_id=" + min_id;
						}
					}
					if (toDate) {
						if (
							searchMode === "user" ||
							allWords ||
							anyWords ||
							thisPhrase
						) {
							queryUrl = queryUrl + "&";
						}
						queryUrl = queryUrl + "max_id=" + max_id;
					}
					queryUrl = encodeURI(queryUrl);
					const queryurlDiv = dialog.querySelector("#queryurl");
					const queryLink = document.createElement("a");
					queryLink.setAttribute("href", queryUrl);
					queryLink.setAttribute("target", "_blank");
					queryLink.textContent = queryUrl;
					queryLink.style.fontWeight = "normal";
					queryurlDiv.textContent = "Query URL: ";
					queryurlDiv.appendChild(queryLink);

					// Fetch query response from server
					try {
						if (
							searchMode !== "user" &&
							!keywords &&
							!allWords &&
							!anyWords &&
							!thisPhrase
						) {
							window.alert("Please provide keywords");
							searchMsg.style.display = "none";
							return;
						} else if (searchMode === "user" && !account) {
							window.alert("Please provide a username");
							accountInput.focus();
							return;
						}
						const response = await fetch(queryUrl, {
							headers: {
								Authorization: `Bearer ${userToken}`,
								scope: "read",
							},
						});
						if (response.status === 401) {
							searchMsg.style.display = "none";
							window.alert(
								"Application not authorized: please authenticate with Truth Social"
							);
							authContainer.style.display = "block";
							authFold.style.display = "block";
							authUnfold.style.display = "none";
							throw new Error("User needs to authorize app");
						} else if (response.status === 403) {
							// searchMsg.style.display = "none";
							// window.alert(
							// 	"You have been temporarily blocked: close Truth Social, wait a while and try again, or use a VPN."
							// );
							// throw new Error("User needs to solve captcha");
							if (
								window.confirm(
									"You have been temporarily blocked: click OK to reset your access and try again"
								)
							) {
								window.location.href =
									"https://truthsocial.com/api/v1/trends";
							}
						} else if (response.status === 429) {
							window.alert(
								"You are being rate limited. Please wait and try again later."
							);
							const html = await response.text();
							dialog.innerHTML = html;
							setTimeout(() => {
								dialog.remove();
							}, 1000);
							searchMsg.style.display = "none";
							throw new Error(
								"Could not fetch: user is being rate limited"
							);
						} else if (!response || !response.ok) {
							window.alert(
								`Error fetching results: status ${response.status}`
							);
							searchMsg.style.display = "none";
							throw new Error("Could not fetch search results.");
						}
						const searchData = await response.json();
						let searchResults = searchData.statuses
							? searchData.statuses
							: searchData;
						if (searchResults.length == 0) {
							searchMsg.style.display = "none";
							noResult.style.display = "block";
						} else {
							searchMsg.style.display = "none";
							searchContainer.style.display = "none";
							searchFold.style.display = "none";
							searchUnfold.style.display = "block";
							extractContainer.style.display = "block";
							extractBtn.style.display = "block";
						}
					} catch (error) {
						console.error(error);
					}
				}

				// Assign role to search button
				searchBtn.addEventListener("click", () => {
					extractContainer.style.display = "none";
					searchMsg.style.display = "block";
					noResult.style.display = "none";
					buildQueryUrl();
				});

				// Declare extraction variables
				let maxToots;
				maxTootsInput.addEventListener("change", () => {
					maxToots = maxTootsInput.value;
					if (!maxToots) {
						maxToots = Infinity;
					}
				});

				let statuses = [];
				let posts = [];
				let id;
				let skippedItems = 0;
				let nextQueryUrl;

				// Assign function to extract button
				extractBtn.addEventListener("click", () => {
					triggerScrape();
				});

				async function triggerScrape() {
					formatSelect.disabled = true;
					maxTootsInput.disabled = true;
					abortBtn.style.display = "block";
					extractBtn.style.display = "none";
					resultsContainer.style.display = "block";
					resultsMsg.textContent = "";
					dlResult.textContent = "";
					resetBtn.style.display = "none";
					try {
						await scrape();
						abortBtn.style.display = "none";
						extractBtn.style.display = "block";
						formatSelect.disabled = false;
						maxTootsInput.disabled = false;
						extractBtn.disabled = false;
						extractSpinner.style.display = "none";
						resultsMsg.textContent =
							statuses.length + " toot(s) extracted";
						showOptions(statuses);
						resetBtn.style.display = "inline-block";
					} catch (error) {
						console.error("Error: ", error);
					}
				}

				// Assign function to abort button
				abortBtn.addEventListener("click", () => {
					abortBtn.textContent = "Aborting...";
					abort = true;
				});
				// Function to scrape toots
				async function scrape() {
					let tootSet = new Set();
					abort = false;
					extractBtn.style.display = "none";
					abortBtn.style.display = "block";
					if (!maxToots) {
						maxToots = Infinity;
					}

					let p = 1;

					let offset = 0;
					skippedItems = 0;

					while (statuses.length < maxToots) {
						await processPage();
						await new Promise((resolve) =>
							setTimeout(resolve, 1000)
						);

						if (statuses.length >= maxToots || abort) {
							abortBtn.textContent = "Abort";
							abortBtn.style.display = "none";
							extractBtn.style.display = "block";
							extractBtn.disabled = true;
							abort = false;
							break;
						}
					}

					async function processPage() {
						try {
							if (maxToots) {
								maxToots = Number(maxToots);
							}
							if (p === 1) {
								nextQueryUrl = queryUrl;
							} else if (p > 1) {
								nextQueryUrl = new URL(queryUrl);
								if (searchMode === "user") {
									nextQueryUrl.searchParams.set(
										"max_id",
										id.toString()
									);
								} else {
									nextQueryUrl.searchParams.set(
										"offset",
										offset.toString()
									);
								}
								nextQueryUrl = nextQueryUrl.toString();
							}
							nextQueryUrl = nextQueryUrl;
							const response = await fetch(nextQueryUrl, {
								headers: {
									Authorization: `Bearer ${userToken}`,
									scope: "read",
								},
							});
							if (response.status === 401) {
								window.alert(
									"Application not authorized: please authenticate with Truth Social"
								);
								abort = true;
								throw new Error(
									"Could not fetch: not authenticated"
								);
							} else if (!response.ok) {
								window.alert(
									`Error fetching results: HTTP error ${response.status}`
								);
								abort = true;
								throw new Error(
									"HTTP error, could not fetch search results"
								);
							}
							const data = await response.json();
							const results = data.statuses
								? data.statuses
								: data;
							offset += results.length;
							if (
								!results.length ||
								(offset > 1 && results.length <= 1)
							) {
								abort = true;
							}
							for (let s of results) {
								if (statuses.length >= maxToots) {
									abort = true;
									break;
								}
								const parser = new DOMParser();
								if (tootSet.has(s.id)) {
									continue;
								}
								if (lang && s.language !== lang) {
									continue;
								}
								if (
									fromDate &&
									s.created_at < fromDate.toISOString()
								) {
									abort = true;
									break;
								}
								if (
									toDate &&
									s.created_at > toDate.toISOString()
								) {
									continue;
								}

								tootSet.add(s.id);
								if (!s.content || s.content.trim() === "") {
									skippedItems++;
									continue;
								}
								let rawText = s.content;
								let rawTextHtml = parser.parseFromString(
									rawText,
									"text/html"
								);
								let rawTextString =
									rawTextHtml.documentElement.innerHTML;
								rawTextString = rawTextString
									.replaceAll("<br>", "\n")
									.replaceAll("<p>", "\n")
									.replaceAll(/<.+?>/gu, "");
								s.content = rawTextString.normalize("NFC");
								statuses.push(s);
								id = s.id;
								if (maxToots !== Infinity) {
									resultsMsg.textContent = `${statuses.length} out of ${maxToots} extracted...`;
								} else {
									resultsMsg.textContent = `${statuses.length} post(s) extracted...`;
								}
								if (statuses.length > maxToots) {
									return;
								}
							}
							p++;
						} catch (error) {
							console.error(error);
						}
					}
				}

				// Show data options dialog
				async function showOptions(statuses) {
					const keyTree = await buildKeyTree(statuses);
					const container = dlDialog.querySelector("#keys-container");
					container.textContent = "";
					generateListTree(keyTree, container);
					const checkboxes = dlDialog.querySelectorAll(
						'input[type="checkbox"].data-item'
					);
					checkboxes.forEach((checkbox) => {
						updateParentCheckboxes(checkbox);
						if (checkbox.checked || checkbox.indeterminate) {
							const div = checkbox.closest(
								"div.nested-container"
							);
							if (div) {
								div.style.height = "auto";
								const arrow = div
									.closest("li")
									.querySelector("span.arrow");
								if (arrow) {
									arrow.textContent = "[less]";
								}
							}
						}
					});
					const postCountSpan = dlDialog.querySelector("#post-count");
					postCountSpan.textContent = `${statuses.length} post(s) extracted — `;
					const closeBtn = dlDialog.querySelector(".close-btn");
					closeBtn.addEventListener("click", () => {
						dlDialog.close();
					});
					dlDialog.showModal();

					async function buildKeyTree(records) {
						let tree = {};
						for (let record of records) {
							async function addToTree(obj, record, prefix = "") {
								for (let key of Object.keys(record)) {
									if (record.hasOwnProperty(key)) {
										const value = record[key];
										const fullKey = prefix
											? `${prefix}.${key}`
											: key;
										if (
											typeof value === "object" &&
											value !== null
										) {
											if (!obj[fullKey]) {
												obj[fullKey] = {};
											}
											await addToTree(
												obj[fullKey],
												value,
												fullKey
											);
										} else {
											obj[fullKey] = null;
										}
									}
								}
							}
							await addToTree(tree, record);
						}
						return tree;
					}

					function generateListTree(tree, container) {
						const ul = document.createElement("ul");
						ul.style.listStyleType = "none";

						for (let key in tree) {
							if (tree.hasOwnProperty(key)) {
								const li = document.createElement("li");
								const checkbox =
									document.createElement("input");
								checkbox.type = "checkbox";
								checkbox.classList.add("data-item");
								checkbox.id = key;
								checkbox.name = key;

								if (
									key === "content" ||
									key === "account.acct" ||
									key === "created_at" ||
									key === "url"
								) {
									checkbox.checked = true;
								}

								const label = document.createElement("label");
								label.htmlFor = key;
								label.appendChild(
									document.createTextNode(
										key.split(".").pop()
									)
								);

								li.appendChild(checkbox);
								li.appendChild(label);
								ul.appendChild(li);

								if (tree[key] !== null) {
									let arrow = document.createElement("span");
									arrow.classList.add("arrow");
									arrow.textContent = "[more]";
									label.after(arrow);
									const nestedContainer =
										document.createElement("div");
									nestedContainer.classList.add(
										"nested-container"
									);
									nestedContainer.style.marginLeft = "20px";
									nestedContainer.style.height = "0px";
									arrow.addEventListener("click", (e) => {
										e.stopPropagation();
										if (
											nestedContainer.style.height ===
											"0px"
										) {
											nestedContainer.style.height =
												"auto";
											arrow.textContent = "[less]";
										} else {
											const nestedContainers = Array.from(
												li.querySelectorAll(
													"div.nested-container"
												)
											);
											nestedContainers.forEach(
												(container) => {
													container.style.height =
														"0px";
												}
											);
											const arrows = Array.from(
												li.querySelectorAll(
													"span.arrow"
												)
											);
											arrows.forEach((a) => {
												a.textContent = "[more]";
											});
										}
									});
									generateListTree(
										tree[key],
										nestedContainer
									);
									li.appendChild(nestedContainer);

									checkbox.addEventListener(
										"change",
										function () {
											const childCheckboxes =
												nestedContainer.querySelectorAll(
													'input[type="checkbox"]'
												);
											childCheckboxes.forEach(
												(childCheckbox) => {
													childCheckbox.checked =
														checkbox.checked;
													childCheckbox.indeterminate = false;
												}
											);
											if (checkbox.checked) {
												nestedContainer.style.height =
													"auto";
												arrow.textContent = "[less]";
											} else {
												nestedContainer.style.height =
													"0px";
												arrow.textContent = "[more]";
											}
										}
									);
								}

								checkbox.addEventListener(
									"change",
									function () {
										updateParentCheckboxes(checkbox);
									}
								);
							}
						}
						container.appendChild(ul);
					}

					function updateParentCheckboxes(checkbox) {
						const parentLi = checkbox
							.closest("li")
							.parentElement.closest("li");
						if (parentLi) {
							const parentCheckbox = parentLi.querySelector(
								'input[type="checkbox"]'
							);
							const childCheckboxes = parentLi.querySelectorAll(
								'div > ul > li > input[type="checkbox"]'
							);
							const allChecked = Array.from(
								childCheckboxes
							).every((child) => child.checked);
							const someChecked = Array.from(
								childCheckboxes
							).some((child) => child.checked);

							parentCheckbox.checked = allChecked;
							parentCheckbox.indeterminate =
								!allChecked && someChecked;

							updateParentCheckboxes(parentCheckbox);
						}
					}
				}

				let fileFormat = "xml";
				formatSelect.addEventListener("change", () => {
					fileFormat = formatSelect.value;
					if (fileFormat === "xlsx") {
						const tableFormat = document.createElement("label");
						tableFormat.htmlFor = "table-checkbox";
						tableFormat.textContent = "Format as table";
						tableFormat.style.display = "block";
						const tableCheckbox = document.createElement("input");
						tableCheckbox.type = "checkbox";
						tableCheckbox.id = "table-checkbox";
						tableCheckbox.style.verticalAlign = "middle";
						tableCheckbox.checked = true;
						tableFormat.appendChild(tableCheckbox);
						dlConfirmBtn.after(tableFormat);
					} else {
						const tableFormat = document.querySelector(
							'label[for="table-checkbox"]'
						);
						if (tableFormat) {
							tableFormat.remove();
						}
					}
				});

				// Listen to anonymize checkbox
				anonymizeCheckbox.addEventListener("change", () => {
					const authorHandleCheckbox =
						document.getElementById("account.acct");
					if (anonymizeCheckbox.checked) {
						authorHandleCheckbox.checked = true;
						authorHandleCheckbox.disabled = true;
						authorHandleCheckbox.nextElementSibling.textContent +=
							" (required for anonymization)";
						updateParentCheckboxes(authorHandleCheckbox);
					} else {
						authorHandleCheckbox.disabled = false;
						authorHandleCheckbox.nextElementSibling.textContent =
							"handle";
					}
				});

				// Listen to download button
				dlConfirmBtn.addEventListener("click", () => {
					buildData();
					if (fileFormat === "json") {
						downloadJson();
					} else if (fileFormat === "csv") {
						downloadCsv();
					} else if (fileFormat === "xml") {
						downloadXml();
					} else if (fileFormat === "txt") {
						downloadTxt();
					} else if (fileFormat === "xlsx") {
						downloadXlsx();
					}
				});

				function getNestedValue(obj, keyPath) {
					return keyPath
						.split(".")
						.reduce((acc, key) => acc && acc[key], obj);
				}

				function buildData() {
					const anonymize = anonymizeCheckbox.checked;
					const accts = new Set();
					const pseudos = {};
					if (anonymize) {
						for (let s of statuses) {
							accts.add(s.account.acct);
						}
						for (let acct of accts) {
							pseudos[acct] = `user_${Object.keys(pseudos).length + 1}`;
						}
					}
					posts = [];
					const checkboxes = dlDialog.querySelectorAll(
						'input[type="checkbox"].data-item'
					);
					for (let s of statuses) {
						if (anonymize) {
							s.account.acct = pseudos[s.account.acct];
							s.account.display_name = pseudos[s.account.acct];
						}
						let post = {};
						for (let checkbox of checkboxes) {
							if (checkbox.checked) {
								const key = checkbox.id;
								const value = getNestedValue(s, key);
								post[key.replaceAll(".", "-")] = value;
							}
						}
						posts.push(post);
					}
				}

				// Download functions
				function downloadCsv() {
					const spinner = document.createElement("span");
					spinner.classList.add("spinner");
					dlConfirmBtn.textContent = "";
					dlConfirmBtn.appendChild(spinner);
					spinner.style.display = "inline-block";
					const header = Object.keys(posts[0]).join("\t");
					const rows = posts.map((post) =>
						Object.values(post).join("\t")
					);
					const csv = [header, ...rows].join("\n");
					const blob = new Blob([csv], { type: "text/csv" });
					const url = URL.createObjectURL(blob);
					const anchor = document.createElement("a");
					anchor.href = url;
					anchor.download = "TruthSocial_scrape.csv";
					spinner.remove();
					dlConfirmBtn.textContent = "Download";
					anchor.click();
				}

				function downloadJson() {
					const spinner = document.createElement("span");
					spinner.classList.add("spinner");
					dlConfirmBtn.textContent = "";
					dlConfirmBtn.appendChild(spinner);
					spinner.style.display = "inline-block";
					const json = JSON.stringify(posts, null, 2);
					const blob = new Blob([json], { type: "application/json" });
					const url = URL.createObjectURL(blob);
					const anchor = document.createElement("a");
					anchor.href = url;
					anchor.download = "TruthSocial_scrape.json";
					spinner.remove();
					dlConfirmBtn.textContent = "Download";
					anchor.click();
				}

				function downloadXml() {
					const spinner = document.createElement("span");
					spinner.classList.add("spinner");
					dlConfirmBtn.textContent = "";
					dlConfirmBtn.appendChild(spinner);
					spinner.style.display = "inline-block";
					let xml = "<Text>";
					for (let p of posts) {
						let postData = "<lb/>\n<toot";
						for (let [key, value] of Object.entries(p)) {
							if (typeof value === "string") {
								p[key] = value
									.replaceAll(/&/g, "&amp;")
									.replaceAll(/</g, "&lt;")
									.replaceAll(/>/g, "&gt;")
									.replaceAll(/"/g, "&quot;")
									.replaceAll(/'/g, "&apos;")
									.replaceAll(/\u00A0/g, " ");
							}
							if (key !== "content" && key !== "url") {
								postData += ` ${key}="${p[key]}"`;
							}
						}
						postData += ">";
						postData += `<lb/><ref target="${p.url}">Link to post</ref><lb/>`;
						let text = p["content"];
						const urlRegex =
							/(?:https?|ftp):\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*[-A-Za-z0-9+&@#\/%=~_|]/;
						const links = text.match(urlRegex);
						if (links) {
							for (l of links) {
								const newLink = l.replace(
									/(.+)/,
									`<ref target="$1">$1</ref>`
								);
								text = text.replace(l, newLink);
							}
						}
						postData += `<lb/>${text.replaceAll(/\n/g, "<lb/>")}`;
						postData += "</toot><lb/><lb/>\n";
						xml += postData;
					}
					xml += `</Text>`;
					const blob = new Blob([xml], { type: "application/xml" });
					const url = URL.createObjectURL(blob);
					const anchor = document.createElement("a");
					anchor.href = url;
					anchor.download = "TruthSocial_scrape.xml";
					spinner.remove();
					dlConfirmBtn.textContent = "Download";
					anchor.click();
				}

				function downloadTxt() {
					const spinner = document.createElement("span");
					spinner.classList.add("spinner");
					dlConfirmBtn.textContent = "";
					dlConfirmBtn.appendChild(spinner);
					spinner.style.display = "inline-block";
					let txt = "";
					for (let p of posts) {
						let postData = p["content"];
						postData += "\n\n";
						txt += postData;
					}
					const blob = new Blob([txt], { type: "text/plain" });
					const url = URL.createObjectURL(blob);
					const anchor = document.createElement("a");
					anchor.href = url;
					anchor.download = "TruthSocial_scrape.txt";
					spinner.remove();
					dlConfirmBtn.textContent = "Download";
					anchor.click();
				}

				async function downloadXlsx() {
					let widths = [];
					Object.keys(posts[0]).forEach((key) => {
						widths.push({ key: key, widths: [] });
					});
					for (let p of posts) {
						for (let [key, value] of Object.entries(p)) {
							if (value) {
								let vString = value.toString();
								widths
									.find((w) => w.key === key)
									.widths.push(key.length, vString.length);
							}
						}
					}
					widths = widths.map((w) => {
						w.widths.sort((a, b) => b - a);
						return w.widths[0];
					});

					const workbook = new ExcelJS.Workbook();
					const worksheet =
						workbook.addWorksheet("TruthSocial_scrape");
					worksheet.columns = Object.keys(posts[0]).map((key) => {
						return { header: key, key: key, width: widths.shift() };
					});

					const rows = [];
					function isDate(value) {
						const regexp =
							/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3}Z)?/;
						return regexp.test(value);
					}
					for (let p of posts) {
						if (p.content.length > 32767) {
							continue;
						}
						let row = [];
						for (let [key, value] of Object.entries(p)) {
							if (isDate(value)) {
								value = new Date(value);
							} else if (key === "url") {
								value = {
									text: value,
									hyperlink: value,
									tooltip: "Link to post",
								};
							}
							row.push(value);
						}
						rows.push(row);
					}

					const tableCheckbox =
						dialog.querySelector("#table-checkbox");
					if (tableCheckbox.checked) {
						worksheet.addTable({
							name: "TruthSocial_scrape",
							ref: "A1",
							headerRow: true,
							totalsRow: false,
							style: {
								theme: "TableStyleMedium9",
								showRowStripes: true,
							},
							columns: worksheet.columns.map((col) => ({
								name: col.header,
								filterButton: true,
							})),
							rows: rows,
						});
					} else {
						worksheet.addRows(rows);
					}
					const urlCol = worksheet.getColumn("url");
					if (urlCol) {
						urlCol.eachCell(function (cell) {
							if (cell.value && cell.value.hyperlink) {
								cell.style = {
									font: {
										color: { argb: "ff0000ff" },
										underline: true,
									},
								};
							}
						});
					}
					const buffer = await workbook.xlsx.writeBuffer();
					const blob = new Blob([buffer], {
						type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					});
					const url = URL.createObjectURL(blob);
					const anchor = document.createElement("a");
					anchor.href = url;
					anchor.download = "TruthSocial_scrape.xlsx";
					anchor.click();
				}

				// Assign role to reset button
				resetBtn.addEventListener("click", () => {
					const inputs = searchContainer.querySelectorAll("input");
					for (let input of inputs) {
						input.value = "";
					}
					location.reload();
				});
			}
		}
	);
};
// });
