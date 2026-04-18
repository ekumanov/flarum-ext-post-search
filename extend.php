<?php

namespace Ekumanov\PostSearch;

use Flarum\Extend;

return [
    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js'),

    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/resources/less/forum.less'),

    (new Extend\Routes('api'))
        ->get('/discussions/{id}/posts-search', 'ekumanov-post-search.search', Controller\DiscussionPostSearchController::class)
        ->get('/discussions/{id}/participants', 'ekumanov-post-search.participants', Controller\DiscussionParticipantsController::class),

    new Extend\Locales(__DIR__ . '/locale'),

    (new Extend\Settings())
        ->default('ekumanov-post-search.dropdownAccess', false)
        ->default('ekumanov-post-search.sideNavAccess', false)
        ->default('ekumanov-post-search.authorQuickFilter', false)
        ->default('ekumanov-post-search.originalPosterBadge', false)
        ->serializeToForum('ekumanov-post-search.dropdownAccess', 'ekumanov-post-search.dropdownAccess', 'boolval')
        ->serializeToForum('ekumanov-post-search.sideNavAccess', 'ekumanov-post-search.sideNavAccess', 'boolval')
        ->serializeToForum('ekumanov-post-search.authorQuickFilter', 'ekumanov-post-search.authorQuickFilter', 'boolval')
        ->serializeToForum('ekumanov-post-search.originalPosterBadge', 'ekumanov-post-search.originalPosterBadge', 'boolval'),
];
