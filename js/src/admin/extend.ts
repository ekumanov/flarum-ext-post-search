import Extend from 'flarum/common/extenders';
import app from 'flarum/admin/app';

export default [
  new Extend.Admin()
    .setting(() => ({
      setting: 'ekumanov-post-search.dropdownAccess',
      type: 'bool',
      label: app.translator.trans('ekumanov-post-search.admin.settings.dropdownAccess'),
      help: app.translator.trans('ekumanov-post-search.admin.settings.dropdownAccessHelp'),
    }))
    .setting(() => ({
      setting: 'ekumanov-post-search.sideNavAccess',
      type: 'bool',
      label: app.translator.trans('ekumanov-post-search.admin.settings.sideNavAccess'),
      help: app.translator.trans('ekumanov-post-search.admin.settings.sideNavAccessHelp'),
    }))
    .setting(() => ({
      setting: 'ekumanov-post-search.authorQuickFilter',
      type: 'bool',
      label: app.translator.trans('ekumanov-post-search.admin.settings.authorQuickFilter'),
      help: app.translator.trans('ekumanov-post-search.admin.settings.authorQuickFilterHelp'),
    }))
    .setting(() => ({
      setting: 'ekumanov-post-search.originalPosterBadge',
      type: 'bool',
      label: app.translator.trans('ekumanov-post-search.admin.settings.originalPosterBadge'),
      help: app.translator.trans('ekumanov-post-search.admin.settings.originalPosterBadgeHelp'),
    })),
];
