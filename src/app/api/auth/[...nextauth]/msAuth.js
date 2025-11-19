/**
 * Store Microsoft tokens on initial sign in
 */
export function storeMicrosoftTokens(token, account) {
	if (account.provider === "azure-ad") {
		token.microsoftAccessToken = account.access_token;
		token.microsoftRefreshToken = account.refresh_token;
		token.microsoftTokenExpiry = account.expires_at * 1000; 
        // convert to milliseconds
	}
}

/**
 * Refresh Microsoft access token if about to expire
 */
export async function refreshMicrosoftToken(token) {
	if ( !token.microsoftRefreshToken || !token.microsoftTokenExpiry || !token.microsoftAccessToken) {
		return token;
	}

	const FIVE_MINUTES = 5 * 60 * 1000;
	const shouldRefresh = Date.now() > token.microsoftTokenExpiry - FIVE_MINUTES;
	if (shouldRefresh) {
		try {
			const AZURE_AD_TENANT_ID = process.env.AZURE_AD_TENANT_ID;
			const response = await fetch(
				`https://login.microsoftonline.com/${AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams({
						client_id: process.env.AZURE_AD_CLIENT_ID,
						client_secret: process.env.AZURE_AD_CLIENT_SECRET,
						grant_type: "refresh_token",
						refresh_token: token.microsoftRefreshToken,
						scope:
							"openid profile email offline_access User.Read Calendars.ReadWrite Mail.Send",
					}),
				}
			);

			if (response.ok) {
				const tokens = await response.json();
				token.microsoftAccessToken = tokens.access_token;
				token.microsoftRefreshToken =
					tokens.refresh_token ?? token.microsoftRefreshToken;
				token.microsoftTokenExpiry = Date.now() + tokens.expires_in * 1000;
			} else {
				const errorData = await response.json();
				console.error("Failed to refresh Microsoft access token:", errorData);
			}
		} catch (error) {
			console.error("Error refreshing Microsoft access token:", error);
		}
	}

	return token;
}
