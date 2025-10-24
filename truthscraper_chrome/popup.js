document.addEventListener("DOMContentLoaded", function () {
	const version = chrome.runtime.getManifest().version;
	document.getElementById("version-div").textContent = "v" + version;

	const errorMsg = document.getElementById("error-msg");
	const startBtn = document.getElementById("start-btn");

    // Perform preliminary checks
	chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
		const tab = tabs[0];
		const url = tab ? tab.url : "";
		if (url !== "https://truthsocial.com/") {
			errorMsg.style.display = "block";
		} else {
			const permissions = await checkPermissions();
            if (permissions) {
                chrome.tabs.sendMessage(tab.id, { action: "checkScraperStatus" }, (response) => {
                    if (response) {
                        document.getElementById("start-container").style.display = "block";
                    } else if (!response) {
                        document.getElementById("reload-container").style.display = "block";
                    }
                });
            }
		}
	});

    // Fire up scraper interface when Start button clicked
	startBtn.addEventListener("click", function () {
		chrome.tabs.query(
			{ active: true, currentWindow: true },
			function (tabs) {
				chrome.tabs.sendMessage(
					tabs[0].id,
					{
						action: "start_truthscraper",
					},
					(response) => {
						if (response) {
							window.close();
						} else {
							document.getElementById(
								"reload-container"
							).style.display = "block";
							document.getElementById(
								"start-container"
							).style.display = "none";
						}
					}
				);
			}
		);
	});

    // Handle reload button click
	const reloadBtn = document.getElementById("reload-btn");
	reloadBtn.addEventListener("click", function () {
		chrome.tabs.query(
			{ active: true, currentWindow: true },
			function (tabs) {
				chrome.tabs.reload(tabs[0].id);
				window.close();
			}
		);
	});

	// Check that extension has necessary permissions
	async function checkPermissions() {
		const permissionsToCheck = {
			origins: ["*://truthsocial.com/*"],
		};

		const hasPermissions = await chrome.permissions.contains(
			permissionsToCheck
		);
		if (!hasPermissions) {
			document.getElementById("grant-permissions").style.display =
				"block";
			return false;
		} else if (hasPermissions) {
			return true;
		}
	}

	// Request permissions
	async function requestPermissions() {
		const permissionsToRequest = {
			origins: ["*://truthsocial.com/*"],
		};

		function onResponse(response) {
			if (response) {
				console.log("Permission was granted");
                window.location.reload();
			} else {
				console.log("Permission was refused");
                window.close();
			}
			return chrome.permissions.getAll();
		}

		const response = await chrome.permissions.request(permissionsToRequest);
		const currentPermissions = await onResponse(response);
		console.log(`Current permissions:`, currentPermissions);
	}

	document
		.getElementById("grant-permissions")
		.addEventListener("click", requestPermissions);
});
