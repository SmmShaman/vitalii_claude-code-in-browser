# Telegram Bot Workflow

## Sequential Workflow (Steps)

```
STEP 1: Image Selection (if no video)
  [Залишити зображення] [Згенерувати своє] [Reject]
      ↓
STEP 2: Publication
  [В новини] [В блог] [Reject]
      ↓
STEP 3: LinkedIn + Social
  [LinkedIn EN] [LinkedIn NO] [LinkedIn UA]
  [Instagram EN] [Facebook EN] ...
      ↓
STEP 4: Final Links
  Article URL + Social post URLs
```

Video posts skip Step 1 entirely (go straight to publish buttons).

## Callback Data Constraints
- Max 64 bytes for callback_data in Telegram Bot API
- UUID is 36 chars, prefix must be <= 28 chars
- Pattern: `action_prefix_${newsId}` where newsId is UUID

## Image Generation Flow (Two Paths)

### Path A: Random Variants
Article -> generate-image-prompt (mode=variants) -> Telegram (1-4 buttons) -> moderator picks -> lang selection -> mode=full -> process-image -> confirm/regenerate

### Path B: Creative Builder
Article -> cb_hub (7 categories) -> moderator picks elements -> cb_gen -> lang selection -> generate-image-prompt (mode=custom, creativeParameters) -> process-image -> confirm/regenerate

## Callback Patterns
- Variant: `select_variant_N_<uuid>`, `vl_N_LL_<uuid>`, `new_variants_<uuid>`, `back_to_variants_<uuid>`
- Builder: `cb_hub_<uuid>`, `cb_c_XX_<uuid>`, `cb_s_XX_N_<uuid>`, `cb_gen_<uuid>`, `cb_rst_<uuid>`, `cb_lg_LL_<uuid>`
- Image: `confirm_image_<uuid>`, `create_custom_<uuid>`, `keep_image_<uuid>`, `upload_image_<uuid>`
- Publish: `publish_news_<uuid>`, `publish_blog_<uuid>`, `reject_<uuid>`
- Social: `linkedin_en/no/ua_<uuid>`, `instagram_en/no/ua_<uuid>`, `facebook_en/no/ua_<uuid>`
- Combo: `combo_all_en_no_<uuid>` (all platforms)

## Photo Upload Flow
1. User clicks "Створити своє" -> bot shows "Очікую фото..."
2. User replies with photo -> webhook detects reply with photo
3. Photo saved to Supabase Storage (custom/ folder)
4. processed_image_url updated in DB
5. Publish buttons shown

## Image Priority
`processed_image_url` > `image_url` > null

## Retry Logic
Approved but unsent posts auto-retry on next scraper run (checks pre_moderation_status=approved, !is_published, !is_rewritten).
