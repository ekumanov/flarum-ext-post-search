<?php

namespace Ekumanov\PostSearch\Controller;

use Flarum\Discussion\Discussion;
use Flarum\Http\RequestUtil;
use Flarum\Post\Post;
use Flarum\User\User;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Returns the full list of unique users who posted in a discussion.
 * Used by the author filter dropdown to show all participants, including
 * those whose posts are not yet loaded in the client-side store.
 */
class DiscussionParticipantsController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $discussionId = Arr::get($request->getAttribute('routeParameters'), 'id');

        /** @var Discussion|null $discussion */
        $discussion = Discussion::query()->whereVisibleTo($actor)->find($discussionId);

        if (!$discussion) {
            return new JsonResponse(['data' => []]);
        }

        // Get unique user IDs from posts in the discussion visible to the actor.
        // `whereVisibleTo` on Posts is how Flarum 2.0 expresses read access — the
        // old `viewDiscussion` ability was removed, and calling `$actor->can()`
        // on it silently returns false for everyone (including admins).
        $userIds = Post::query()
            ->where('discussion_id', $discussion->id)
            ->whereVisibleTo($actor)
            ->whereNotNull('user_id')
            ->distinct()
            ->pluck('user_id')
            ->all();

        if (empty($userIds)) {
            return new JsonResponse(['data' => []]);
        }

        $users = User::query()->whereIn('id', $userIds)->get();

        // Return in JSON:API format so it can be consumed by the Flarum store
        $data = $users->map(function (User $user) {
            return [
                'type' => 'users',
                'id' => (string) $user->id,
                'attributes' => [
                    'username' => $user->username,
                    'displayName' => $user->display_name,
                    'avatarUrl' => $user->avatar_url,
                    'slug' => (string) $user->id,
                ],
            ];
        })->values()->all();

        return new JsonResponse(['data' => $data]);
    }
}
