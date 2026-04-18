# Post Search for Flarum 2.0

Search and filter posts within a discussion by keyword or author, with matched terms highlighted in the post stream.

## Features

- **Find in discussion** — A toolbar search field that filters the current discussion's post stream to posts matching a keyword. Non-matching posts are replaced with a "N non-matching posts hidden" gap indicator so navigation stays anchored to the full discussion.
- **Filter by author** — Multi-user chip selector next to the search field. Pick one or more participants to restrict the stream to their posts. Suggestions are pre-loaded with the discussion's actual participants, so the dropdown works for regular users without `viewUserList` permission.
- **Search highlighting** — Matched query terms are wrapped in `<mark>` tags within rendered post content while a filter is active.
- **Sticky toolbar** — Pin button keeps the filter toolbar open across discussions; close button clears filters and hides it.
- **Multiple access points** — Configurable entry buttons in the discussion controls dropdown, the sidebar navigation, and per-post controls.
- **Author quick-filter** — Optional "Show only replies from this author" item in each post's controls menu.
- **Discussion-starter shortcut** — Optional clickable "Discussion starter" label next to each post by the original poster; clicking it filters the stream to that user.
- **Permission-aware** — Respects post visibility: soft-deleted / hidden posts and posts in restricted discussions are filtered server-side via Flarum's `whereVisibleTo` scope.
- **Fully localizable** — All UI strings use locale keys with ICU plural support.

## Requirements

- **Flarum 2.0** (not compatible with Flarum 1.x)
- **PHP 8.2+**

## Installation

```bash
composer require ekumanov/flarum-ext-post-search
php flarum cache:clear
```

Then enable the extension in the admin panel under **Extensions > Post Search**.

## Configuration

### Admin Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Access via discussion dropdown | Disabled | Show a "Search discussion" button in the discussion controls dropdown |
| Access via discussion side navigation | Disabled | Show a "Search discussion" button in the discussion sidebar |
| Quick filter for post author | Disabled | Add a "Show only replies from this author" shortcut to each post's controls |
| Discussion-starter shortcut | Disabled | Show a clickable "Discussion starter" label next to posts by the original poster; clicking it filters the stream to that user |

All four toggles default to off so the extension is opt-in per forum.

## Credits

This extension is a port and consolidation of two of [Clark Winkelmann](https://discuss.flarum.org/u/clarkwinkelmann)'s Flarum 1.x extensions into a single Flarum 2.0 package:

- [clarkwinkelmann/flarum-ext-post-stream-search](https://discuss.flarum.org/d/24941) — the per-discussion search toolbar and author filter
- [clarkwinkelmann/flarum-ext-advanced-search-highlight](https://discuss.flarum.org/d/24942) — the search-term highlighting inside posts

The "Discussion starter" shortcut is a small original feature added on top — a clickable label, not a styled badge.

The relationship-select component used by the author filter is inlined from [flamarkt/backoffice](https://github.com/flamarkt/backoffice), so there is no runtime dependency on that package.

Porting and merging was done with [Claude Code](https://claude.ai/code).

## Updating

```bash
composer update ekumanov/flarum-ext-post-search
php flarum cache:clear
```

## Links

- [Packagist](https://packagist.org/packages/ekumanov/flarum-ext-post-search)
- [Report Issues](https://github.com/ekumanov/flarum-ext-post-search/issues)

## License

MIT
