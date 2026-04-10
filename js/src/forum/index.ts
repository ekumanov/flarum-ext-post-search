import {extend, override} from 'flarum/common/extend';
import app from 'flarum/forum/app';
import Button from 'flarum/common/components/Button';
import Tooltip from 'flarum/common/components/Tooltip';
import CommentPost from 'flarum/forum/components/CommentPost';
import DiscussionPage from 'flarum/forum/components/DiscussionPage';
import PostStream from 'flarum/forum/components/PostStream';
import PostStreamState from 'flarum/forum/states/PostStreamState';
import DiscussionControls from 'flarum/forum/utils/DiscussionControls';
import PostControls from 'flarum/forum/utils/PostControls';
import Post from 'flarum/common/models/Post';
import icon from 'flarum/common/helpers/icon';
import ItemList from 'flarum/common/utils/ItemList';
import Toolbar from './components/Toolbar';

interface FilteredPost {
    id: string;
    number: number;
}

app.initializers.add('ekumanov-post-search', () => {
    // Add toolbar to the discussion page
    extend(DiscussionPage.prototype, 'pageContent', function (items) {
        if (!this.stream || !(this.stream as any).showToolbar) {
            return;
        }

        items.add('stream-toolbar', m(Toolbar, {
            stream: this.stream,
        }), -200);
    });

    // Initialize filter state on PostStreamState
    extend(PostStreamState.prototype, 'show', function () {
        const self = this as any;
        if (typeof self.showToolbar !== 'undefined') {
            return;
        }

        self.showToolbar = !!window.localStorage.getItem('showPostStreamToolbar');
        self.filterSearch = '';
        self.filterUsers = [];
        self.filteredPostIds = null;
        self.filteredPostNumbers = null;
        self.filterLoading = false;
        self.highlightRegex = null;
    });

    // Override loadRange to load filtered posts by ID
    override(PostStreamState.prototype, 'loadRange', function (original, start, end) {
        const self = this as any;
        if (!Array.isArray(self.filteredPostIds)) {
            return original(start, end);
        }

        const loadIds: string[] = [];
        const loaded: Post[] = [];

        self.filteredPostIds.slice(start, end).forEach((id: string) => {
            const post = app.store.getById<Post>('posts', id);
            if (post && post.discussion() && typeof post.canEdit() !== 'undefined') {
                loaded.push(post);
            } else {
                loadIds.push(id);
            }
        });

        if (loadIds.length) {
            return app.store.find<Post[]>('posts', loadIds).then((newPosts) => {
                return loaded.concat(newPosts).sort((a, b) => a.number() - b.number());
            });
        }

        return Promise.resolve(loaded);
    });

    // Override show to calculate visible range for filtered results
    override(PostStreamState.prototype, 'show', function (original, posts) {
        const self = this as any;
        if (!Array.isArray(self.filteredPostIds)) {
            return original(posts);
        }

        self.visibleStart = posts.length ? self.filteredPostIds.indexOf(posts[0].id() ?? '0') : 0;
        self.visibleEnd = self.sanitizeIndex(self.visibleStart + posts.length);
    });

    // Override posts to return filtered slice
    override(PostStreamState.prototype, 'posts', function (original) {
        const self = this as any;
        if (!Array.isArray(self.filteredPostIds)) {
            return original();
        }

        return self.filteredPostIds.slice(self.visibleStart, self.visibleEnd).map((id: string) => {
            const post = app.store.getById<Post>('posts', id);
            return post && post.discussion() && typeof post.canEdit() !== 'undefined' ? post : null;
        });
    });

    // Override count for filtered results
    override(PostStreamState.prototype, 'count', function (original) {
        const self = this as any;
        if (!Array.isArray(self.filteredPostIds)) {
            return original();
        }
        return self.filteredPostIds.length;
    });

    // Override loadNearNumber for filtered results
    override(PostStreamState.prototype, 'loadNearNumber', function (original, number) {
        const self = this as any;
        if (!Array.isArray(self.filteredPostIds)) {
            return original(number);
        }

        if (self.posts().some((post: Post) => post && Number(post.number()) === Number(number))) {
            return Promise.resolve();
        }

        const suggestRemovingFilter = () => {
            let alert: any;
            const viewButton = Button.component({
                className: 'Button Button--link',
                onclick: () => {
                    self.clearFilters(number);
                    app.alerts.dismiss(alert);
                },
            }, app.translator.trans('ekumanov-post-search.forum.cannotGoToPost.action'));

            alert = app.alerts.show({
                controls: [viewButton],
            }, app.translator.trans('ekumanov-post-search.forum.cannotGoToPost.message'));
        };

        const postExistsInStore = app.store.all<Post>('posts').some(
            post => Number(post.number()) === Number(number) && post.discussion() === self.discussion
        );

        if (postExistsInStore) {
            suggestRemovingFilter();
            return Promise.resolve();
        }

        self.reset();

        // Find the closest filtered post to the requested number
        return self.retrieveFilteredDiscussion().then(() => {
            const closestIndex = self.findClosestIndex(number);
            const start = Math.max(0, closestIndex - 10);
            const end = Math.min(self.filteredPostIds.length, closestIndex + 10);

            return self.loadRange(start, end).then((posts: Post[]) => {
                self.show(posts);

                const matchingPost = posts.find((p: Post) => p && Number(p.number()) === Number(number));
                if (!matchingPost) {
                    suggestRemovingFilter();
                }
            });
        });
    });

    // Override update to refresh filtered list when a new post is added
    override(PostStreamState.prototype, 'update', function (original) {
        const self = this as any;
        if (!Array.isArray(self.filteredPostIds)) {
            return original();
        }

        return new Promise<void>(resolve => {
            self.retrieveFilteredDiscussion().then(() => {
                original().then(() => {
                    resolve();
                });
            });
        });
    });

    // Add custom methods to PostStreamState
    PostStreamState.prototype.retrieveFilteredDiscussion = function () {
        const self = this as any;
        const filter: any = {};

        if (self.filterSearch) {
            filter.q = self.filterSearch;
        }

        if (self.filterUsers.length > 0) {
            filter.author = self.filterUsers.map((user: any) => user.username()).join(',');
        }

        self.filterLoading = true;

        return app.request<{data: FilteredPost[]}>({
            method: 'GET',
            url: app.forum.attribute('apiUrl') + '/discussions/' + self.discussion.id() + '/posts-search',
            params: {filter},
        }).then(response => {
            self.filteredPostIds = response.data.map((p: FilteredPost) => String(p.id));
            self.filteredPostNumbers = new Map<string, number>();
            response.data.forEach((p: FilteredPost) => {
                self.filteredPostNumbers.set(String(p.id), p.number);
            });

            self.filterLoading = false;

            return response;
        });
    };

    PostStreamState.prototype.findClosestIndex = function (near: number) {
        const self = this as any;
        if (!self.filteredPostNumbers) return 0;

        let closestIndex = 0;
        let closestDistance = Infinity;

        self.filteredPostIds.forEach((id: string, index: number) => {
            const postNumber = self.filteredPostNumbers.get(id);
            if (postNumber !== undefined) {
                const distance = Math.abs(postNumber - near);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIndex = index;
                }
            }
        });

        return closestIndex;
    };

    PostStreamState.prototype.applyFilters = function (near?: number) {
        const self = this as any;

        // Read the current position from the URL if not provided
        const expectedPathPrefix = app.route.discussion(self.discussion) + '/';
        const urlPath = window.location.pathname;

        if (!near && urlPath.indexOf(expectedPathPrefix) === 0) {
            near = parseInt(urlPath.substring(expectedPathPrefix.length));
        }

        if (!self.filterSearch && self.filterUsers.length === 0) {
            self.filteredPostIds = null;
            self.filteredPostNumbers = null;
            self.highlightRegex = null;

            if (near) {
                self.goToNumber(near);
            } else {
                self.goToFirst();
            }

            return;
        }

        self.retrieveFilteredDiscussion().then(() => {
            // Build the highlight regex for client-side highlighting
            if (self.filterSearch) {
                const escaped = self.filterSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const words = escaped.split(/\s+/).filter(Boolean);
                if (words.length) {
                    self.highlightRegex = new RegExp('(' + words.join('|') + ')', 'gi');
                }
            } else {
                self.highlightRegex = null;
            }

            if (self.filteredPostIds.length === 0) {
                self.show([]);
                m.redraw();
                return;
            }

            // Find closest post to where we were
            const closestIndex = near ? self.findClosestIndex(near) : 0;
            const halfPage = 10;
            const start = Math.max(0, closestIndex - halfPage);
            const end = Math.min(self.filteredPostIds.length, closestIndex + halfPage);

            self.loadRange(start, end).then((posts: Post[]) => {
                self.show(posts);
                m.redraw();

                // Scroll to the closest post
                if (near && posts.length) {
                    let closestPost = posts[0];
                    let closestDist = Infinity;

                    posts.forEach((post: Post) => {
                        if (!post) return;
                        const dist = Math.abs(post.number() - near!);
                        if (dist < closestDist) {
                            closestDist = dist;
                            closestPost = post;
                        }
                    });

                    if (closestPost) {
                        self.goToNumber(closestPost.number());
                    }
                } else if (posts.length) {
                    self.goToFirst();
                }
            });
        });
    };

    PostStreamState.prototype.clearFilters = function (near?: number) {
        const self = this as any;
        self.filterSearch = '';
        self.filterUsers = [];
        self.applyFilters(near);
    };

    // Keyboard shortcut: Ctrl/Cmd+F to open toolbar
    window.addEventListener('keydown', function (event) {
        const stream = app.current.get('stream');
        if (!stream) return;

        if ((event.ctrlKey || event.metaKey) && event.key === 'f' && app.current.matches(DiscussionPage)) {
            event.preventDefault();

            (stream as any).showToolbar = true;

            const selection = window.getSelection()?.toString().trim();
            if (selection) {
                (stream as any).filterSearch = selection;
                (stream as any).applyFilters();
            }

            m.redraw();

            setTimeout(() => {
                $('.js-post-toolbar-autofocus').trigger('focus').trigger('select');
            }, 0);

            // Hide the quote button if visible
            $('.Post-quoteButtonContainer .PostQuoteButton').hide();
        }

        if (event.key === 'Escape' && (stream as any).showToolbar) {
            const pinned = !!window.localStorage.getItem('showPostStreamToolbar');
            if (!pinned) {
                (stream as any).showToolbar = false;
                m.redraw();
            }
            (stream as any).clearFilters();
        }
    });

    // Show gap indicators between filtered posts
    extend(PostStream.prototype, 'view', function (vdom) {
        const stream = this.stream as any;
        if (!Array.isArray(stream.filteredPostIds)) return;

        if (stream.filteredPostIds.length === 0) {
            vdom.children.unshift(m('.PostStream-filterNoResults', [
                icon('fas fa-search'),
                m('div', app.translator.trans('ekumanov-post-search.forum.stream.noResults')),
            ]));
            return;
        }

        const allPostIds = this.discussion.postIds();
        const translation = 'ekumanov-post-search.forum.stream.' + (stream.filterSearch ? 'unmatchedGap' : 'otherAuthorsGap');

        vdom.children.forEach((item: any) => {
            if (!item.attrs || !item.attrs['data-id']) return;

            const indexInDiscussion = allPostIds.indexOf(item.attrs['data-id']);
            const indexInResults = stream.filteredPostIds.indexOf(item.attrs['data-id']);

            if (indexInDiscussion < 0 || indexInResults < 0) return;

            // For the first result, show gap before it
            if (indexInResults === 0 && indexInDiscussion > 0) {
                item.children.unshift(m('.PostStream-timeGap', app.translator.trans(translation, {
                    count: indexInDiscussion,
                })));
            }

            if (indexInDiscussion === allPostIds.length - 1) return;

            const nextPostIdInResults = stream.filteredPostIds[indexInResults + 1];
            const indexOfNextPostInAllDiscussion = indexInResults + 1 >= stream.filteredPostIds.length
                ? allPostIds.length
                : allPostIds.indexOf(nextPostIdInResults);

            if (indexOfNextPostInAllDiscussion < 0) return;

            const gap = indexOfNextPostInAllDiscussion - indexInDiscussion - 1;
            if (gap <= 0) return;

            item.children.push(m('.PostStream-timeGap', app.translator.trans(translation, {
                count: gap,
            })));
        });
    });

    // Client-side search term highlighting in post content
    extend(CommentPost.prototype, 'oncreate', function () {
        this.highlightSearchTerms();
    });

    extend(CommentPost.prototype, 'onupdate', function () {
        this.highlightSearchTerms();
    });

    CommentPost.prototype.highlightSearchTerms = function () {
        const stream = app.current.get('stream') as any;
        if (!stream?.highlightRegex) return;

        const postBody = this.element?.querySelector('.Post-body');
        if (!postBody) return;

        // Skip if already highlighted
        if (postBody.getAttribute('data-highlighted') === stream.filterSearch) return;
        postBody.setAttribute('data-highlighted', stream.filterSearch);

        highlightTextNodes(postBody, stream.highlightRegex);
    };

    // Add toolbar button to discussion controls dropdown
    function addToolbarButton(items: ItemList<any>, className: string = '') {
        items.add('filter-toolbar', Button.component({
            className: 'Button--filter-toolbar' + (className ? ' ' + className : ''),
            onclick() {
                const stream = app.current.get('stream');
                if (stream) {
                    (stream as any).showToolbar = true;
                    setTimeout(() => {
                        $('.js-post-toolbar-autofocus').trigger('focus');
                    }, 0);
                }
            },
            icon: 'fas fa-search',
        }, app.translator.trans('ekumanov-post-search.forum.discussionControls.searchInDiscussion')));
    }

    extend(DiscussionControls, 'userControls', function (items) {
        if (!app.forum.attribute('ekumanov-post-search.dropdownAccess')) return;
        addToolbarButton(items);
    });

    extend(DiscussionPage.prototype, 'sidebarItems', function (items) {
        if (!app.forum.attribute('ekumanov-post-search.sideNavAccess')) return;
        addToolbarButton(items, 'Button');
    });

    // Quick filter by post author
    extend(PostControls, 'userControls', function (items, post) {
        if (!app.forum.attribute('ekumanov-post-search.authorQuickFilter')) return;

        const author = post.user();
        if (!author) return;

        items.add('filter-author', Button.component({
            onclick() {
                const stream = app.current.get('stream') as any;
                if (stream) {
                    stream.showToolbar = true;
                    stream.filterSearch = '';
                    stream.filterUsers = [author];
                    stream.applyFilters();
                }
            },
            icon: 'fas fa-filter',
        }, app.translator.trans('ekumanov-post-search.forum.postControls.authorFilter')));
    });

    // OP badge
    extend(CommentPost.prototype, 'headerItems', function (items) {
        if (!app.forum.attribute('ekumanov-post-search.originalPosterBadge')) return;

        const user = this.attrs.post.user();
        const discussion = this.attrs.post.discussion();

        if (user && user === discussion.user()) {
            items.add('original-poster', Tooltip.component({
                text: app.translator.trans('ekumanov-post-search.forum.post.opBadgeTooltip'),
            }, m('span.OriginalPosterBadge', {
                onclick() {
                    const stream = app.current.get('stream') as any;
                    if (stream) {
                        stream.showToolbar = true;
                        stream.filterSearch = '';
                        stream.filterUsers = [user];
                        stream.applyFilters();
                    }
                },
            }, app.translator.trans('ekumanov-post-search.forum.post.opBadge'))));
        }
    });
});

/**
 * Walk text nodes in a DOM element and wrap matches in <mark> tags.
 * Skips script, style, mark, textarea, and input elements.
 */
function highlightTextNodes(element: Element, regex: RegExp) {
    // Remove existing highlights first
    element.querySelectorAll('mark.search-highlight').forEach(mark => {
        const parent = mark.parentNode;
        if (parent) {
            parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
            parent.normalize();
        }
    });

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (parent && ['SCRIPT', 'STYLE', 'MARK', 'TEXTAREA', 'INPUT'].includes(parent.tagName)) {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        },
    });

    const textNodes: Text[] = [];
    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
        textNodes.push(node);
    }

    textNodes.forEach(textNode => {
        const text = textNode.textContent || '';
        regex.lastIndex = 0;

        if (!regex.test(text)) return;
        regex.lastIndex = 0;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
            }

            const mark = document.createElement('mark');
            mark.className = 'search-highlight';
            mark.textContent = match[0];
            fragment.appendChild(mark);

            lastIndex = regex.lastIndex;

            // Prevent infinite loop on zero-length matches
            if (match[0].length === 0) {
                regex.lastIndex++;
            }
        }

        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }

        textNode.parentNode?.replaceChild(fragment, textNode);
    });
}
