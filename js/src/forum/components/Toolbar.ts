import app from 'flarum/forum/app';
import Component, {ComponentAttrs} from 'flarum/common/Component';
import PostStreamState from 'flarum/forum/states/PostStreamState';
import Button from 'flarum/common/components/Button';
import Tooltip from 'flarum/common/components/Tooltip';
import ItemList from 'flarum/common/utils/ItemList';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import Post from 'flarum/common/models/Post';
import User from 'flarum/common/models/User';
import UserRelationshipSelect from './UserRelationshipSelect';

interface ToolbarAttrs extends ComponentAttrs {
    stream: PostStreamState
}

export default class Toolbar extends Component<ToolbarAttrs> {
    searchDebounce: number = 0;

    view() {
        const actions = this.actionItems().toArray();

        return m('.PostStreamToolbarWrapper', m('.container', m('.PostStreamToolbar', [
            this.filterItems().toArray(),
            m('.PostStreamToolbar-push'),
            actions,
            actions.length ? m('.PostStreamToolbar-separator') : null,
            this.toolbarControlItems().toArray(),
        ])));
    }

    filterItems() {
        const items = new ItemList();
        const stream = this.attrs.stream as any;

        items.add('search', m('input.FormControl.js-post-toolbar-autofocus', {
            placeholder: app.translator.trans('ekumanov-post-search.forum.toolbar.searchPlaceholder'),
            value: stream.filterSearch,
            oninput: (e: Event) => {
                stream.filterSearch = (e.target as HTMLInputElement).value;

                clearTimeout(this.searchDebounce);
                this.searchDebounce = setTimeout(() => {
                    stream.applyFilters();
                }, 300) as any;
            },
        }), 100);

        items.add('user', m(UserRelationshipSelect, {
            relationship: stream.filterUsers,
            onchange: (users: any) => {
                stream.filterUsers = users;
                stream.applyFilters();
            },
            placeholder: app.translator.trans('ekumanov-post-search.forum.toolbar.authorPlaceholder'),
            suggest: () => this.fetchParticipants(),
        }), 50);

        if (stream.filterLoading) {
            items.add('loading', LoadingIndicator.component({
                display: 'inline',
            }), -50);
        } else if (Array.isArray(stream.filteredPostIds)) {
            items.add('summary', m('span.PostStreamToolbarText', app.translator.trans('ekumanov-post-search.forum.toolbar.summary', {
                matching: stream.filteredPostIds.length,
                total: stream.discussion.postIds().length,
            })), -50);
        }

        return items;
    }

    /**
     * Fetch all participants for the discussion via our custom endpoint.
     * Only loaded posts' authors would otherwise be available, so we need
     * to fetch the full participant list from the server.
     */
    fetchParticipants(): Promise<User[]> {
        const stream = this.attrs.stream as any;
        const discussion = stream.discussion;

        return app.request<{data: Array<{type: string; id: string; attributes: any}>}>({
            method: 'GET',
            url: app.forum.attribute('apiUrl') + '/discussions/' + discussion.id() + '/participants',
        }).then(response => {
            // Push into store so User models exist, then return them
            const users: User[] = response.data
                .map(raw => app.store.pushPayload<User>({data: raw}))
                .filter(Boolean);

            // Sort by post count in the discussion for loaded posts first, alphabetical otherwise
            const postCounts = new Map<string, number>();
            discussion.postIds().forEach((id: string) => {
                const post = app.store.getById<Post>('posts', id);
                if (!post) return;
                const author = post.user();
                if (!author || !author.id()) return;
                postCounts.set(author.id()!, (postCounts.get(author.id()!) || 0) + 1);
            });

            users.sort((a, b) => {
                const ca = postCounts.get(a.id()!) || 0;
                const cb = postCounts.get(b.id()!) || 0;
                if (ca !== cb) return cb - ca;
                return (a.displayName() || '').localeCompare(b.displayName() || '');
            });

            return users;
        }).catch(() => [] as User[]);
    }

    actionItems() {
        return new ItemList();
    }

    toolbarControlItems() {
        const items = new ItemList();
        const stream = this.attrs.stream as any;
        const pinned = !!window.localStorage.getItem('showPostStreamToolbar');

        items.add('pin', Tooltip.component({
            text: app.translator.trans('ekumanov-post-search.forum.toolbar.pin'),
        }, Button.component({
            className: 'Button Button--icon' + (pinned ? ' active' : ''),
            icon: 'fas fa-thumbtack',
            onclick: () => {
                if (pinned) {
                    window.localStorage.removeItem('showPostStreamToolbar');
                } else {
                    window.localStorage.setItem('showPostStreamToolbar', '1');
                }
            },
        })), 100);

        items.add('close', Tooltip.component({
            text: app.translator.trans('ekumanov-post-search.forum.toolbar.' + (pinned ? 'clear' : 'close')),
        }, Button.component({
            className: 'Button Button--icon',
            icon: 'fas fa-times',
            onclick: () => {
                if (!pinned) {
                    stream.showToolbar = false;
                }
                stream.clearFilters();
            },
        })), 50);

        return items;
    }
}
