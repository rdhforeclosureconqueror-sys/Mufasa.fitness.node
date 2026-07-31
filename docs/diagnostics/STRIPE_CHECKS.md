# Stripe Checks

Static mode checks `BILLING_ENABLED`, test/live consistency, safe prefixes for the secret key, webhook secret and price ID, plus checkout/webhook route presence. It makes no network request and reveals neither values nor unnecessary prefixes. The explicit external mode performs one bounded authenticated GET for the configured Price, creates nothing, charges nothing, reports only HTTP/result metadata, and never changes Stripe resources.
