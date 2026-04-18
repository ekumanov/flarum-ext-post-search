import app from 'flarum/forum/app';
import User from 'flarum/common/models/User';
import username from 'flarum/common/helpers/username';
import highlight from 'flarum/common/helpers/highlight';
import AbstractRelationshipSelect from './AbstractRelationshipSelect';

/**
 * A relationship select component for choosing users.
 * Adapted from flamarkt/backoffice.
 */
export default class UserRelationshipSelect extends AbstractRelationshipSelect<User> {
    protected resultsCache = new Map<string, User[]>();

    className() {
        return 'UserRelationshipSelect';
    }

    search(query: string) {
        if (!query) {
            m.redraw();
            return Promise.resolve();
        }

        return app.store
            .find<User[]>('users', {
                filter: {q: query},
                page: {limit: 5},
            })
            .then((results) => {
                this.resultsCache.set(query.toLowerCase(), results);
                m.redraw();
            })
            .catch(() => {
                // The actor may lack `viewUserList` — the `/api/users` endpoint
                // returns 403 for unprivileged users and guests. Cache an empty
                // array so `results()` stops returning `null` (which shows an
                // endless loading spinner); it then falls through to the store
                // filter below, which surfaces any users already loaded —
                // notably the discussion participants pre-fetched for
                // `suggest`.
                this.resultsCache.set(query.toLowerCase(), [] as User[]);
                m.redraw();
            });
    }

    results(query: string) {
        if (!query) {
            return this.suggestedResults();
        }

        query = query.toLowerCase();
        const results = this.resultsCache.get(query);

        if (typeof results === 'undefined') {
            return null;
        }

        return (results || [])
            .concat(
                app.store
                    .all<User>('users')
                    .filter((user) => [user.username(), user.displayName()].some((value) => value.toLowerCase().substring(0, query.length) === query))
            )
            .filter((e, i, arr) => arr.lastIndexOf(e) === i)
            .sort((a, b) => a.displayName().localeCompare(b.displayName()));
    }

    renderAvatar(user: User) {
        const displayName = user.displayName() || '?';
        const avatarUrl = user.avatarUrl();

        if (avatarUrl) {
            return m('img.Avatar', { src: avatarUrl, alt: displayName, loading: 'lazy' });
        }

        return m('span.Avatar', {
            style: { '--avatar-bg': user.color() },
        }, displayName.charAt(0).toUpperCase());
    }

    item(user: User, query?: string) {
        const displayName = user.displayName();

        return [
            this.renderAvatar(user),
            query
                ? m('span.username', highlight(displayName, query))
                : username(user),
        ];
    }
}
