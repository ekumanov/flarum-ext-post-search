<?php

namespace Ekumanov\PostSearch\Controller;

use Ekumanov\PostSearch\PostSearchHelper;
use Flarum\Http\RequestUtil;
use Flarum\Post\Filter\PostSearcher;
use Flarum\Post\Post;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Returns the full list of matching post IDs (with numbers) for a discussion,
 * filtered by keyword and/or other criteria.
 */
class DiscussionPostSearchController implements RequestHandlerInterface
{
    public function __construct(
        protected PostSearcher $searcher
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $params = $request->getQueryParams();
        $discussionId = Arr::get($request->getAttribute('routeParameters'), 'id');

        $filters = Arr::get($params, 'filter', []);
        $filters['discussion'] = $discussionId;

        $query = PostSearchHelper::getFilteredQuery($this->searcher, $actor, $filters);

        $results = $query->select(['posts.id', 'posts.number'])->get();

        $data = $results->map(fn (Post $post) => [
            'id' => (string) $post->id,
            'number' => $post->number,
        ])->values()->all();

        return new JsonResponse(['data' => $data]);
    }
}
