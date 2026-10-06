import sys
from fyers_apiv3 import fyersModel
from bot import TOKEN_CACHE_FILE, extract_auth_code, run_fyers_backtest

CLIENT_ID = "0KALUO8SXP-200"
SECRET_KEY = "OHxCsnfXvIWRg69o"
REDIRECT_URI = "https://trade.fyers.in/api-login/redirect-uri-result.html"

def exchange_code_and_run(auth_input: str, symbol="NSE:SBIN-EQ", resolution="15", days_back=30):
    auth_code = extract_auth_code(auth_input)
    if not auth_code:
        print("[-] Invalid auth code provided.")
        return

    print(f"[*] Exchanging auth code for access token...")
    session = fyersModel.SessionModel(
        client_id=CLIENT_ID,
        secret_key=SECRET_KEY,
        redirect_uri=REDIRECT_URI,
        response_type="code",
        grant_type="authorization_code"
    )
    
    session.set_token(auth_code)
    response = session.generate_token()
    
    if isinstance(response, dict) and response.get("s") == "ok":
        access_token = response.get("access_token")
        with open(TOKEN_CACHE_FILE, "w", encoding="utf-8") as f:
            f.write(access_token)
        print("[+] Access token successfully generated and cached!")
        
        # Verify profile
        fyers = fyersModel.FyersModel(client_id=CLIENT_ID, token=access_token, is_async=False, log_path="")
        prof = fyers.get_profile()
        if isinstance(prof, dict) and prof.get("s") == "ok":
            user_name = prof.get("data", {}).get("name", "User")
            fy_id = prof.get("data", {}).get("fy_id", "")
            print(f"[+] Verified Fyers Account: {user_name} ({fy_id})")
        
        # Run Backtest with live data
        print(f"\n[*] Starting Backtest on {symbol}...")
        trades = run_fyers_backtest(
            client_id=CLIENT_ID,
            access_token=access_token,
            symbol=symbol,
            resolution=resolution,
            days_back=days_back,
            output_csv="trades_data.csv"
        )
        return trades
    else:
        print(f"[-] Token generation failed: {response}")
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        code_input = sys.argv[1]
        exchange_code_and_run(code_input)
    else:
        user_input = input("Paste redirected URL or auth code: ")
        exchange_code_and_run(user_input)
