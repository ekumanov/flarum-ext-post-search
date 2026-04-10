import app from 'flarum/admin/app';

app.initializers.add('ekumanov-post-search', () => {
    app.extensionData
        .for('ekumanov-post-search')
        .registerSetting({
            type: 'switch',
            setting: 'ekumanov-post-search.dropdownAccess',
            label: app.translator.trans('ekumanov-post-search.admin.settings.dropdownAccess'),
            help: app.translator.trans('ekumanov-post-search.admin.settings.dropdownAccessHelp'),
        })
        .registerSetting({
            type: 'switch',
            setting: 'ekumanov-post-search.sideNavAccess',
            label: app.translator.trans('ekumanov-post-search.admin.settings.sideNavAccess'),
            help: app.translator.trans('ekumanov-post-search.admin.settings.sideNavAccessHelp'),
        })
        .registerSetting({
            type: 'switch',
            setting: 'ekumanov-post-search.authorQuickFilter',
            label: app.translator.trans('ekumanov-post-search.admin.settings.authorQuickFilter'),
            help: app.translator.trans('ekumanov-post-search.admin.settings.authorQuickFilterHelp'),
        })
        .registerSetting({
            type: 'switch',
            setting: 'ekumanov-post-search.originalPosterBadge',
            label: app.translator.trans('ekumanov-post-search.admin.settings.originalPosterBadge'),
            help: app.translator.trans('ekumanov-post-search.admin.settings.originalPosterBadgeHelp'),
        });
});
