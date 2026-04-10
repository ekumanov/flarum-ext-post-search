<?php

namespace Ekumanov\PostSearch;

use Flarum\Post\Filter\PostSearcher;
use Flarum\Search\Database\DatabaseSearchState;
use Flarum\Search\SearchCriteria;
use Flarum\User\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Extends PostSearcher to access its protected internals for running
 * a search without pagination, returning the raw query builder.
 */
class PostSearchHelper extends PostSearcher
{
    public static function getFilteredQuery(PostSearcher $searcher, User $actor, array $filters): Builder
    {
        $query = $searcher->getQuery($actor);

        $criteria = new SearchCriteria($actor, $filters);
        $state = new DatabaseSearchState($actor, $criteria->isFulltext());
        $state->setQuery($query);

        $searcher->filters->apply($state, $filters);

        // Always sort by post number for discussion context
        $state->getQuery()->orderBy('posts.number', 'asc');

        foreach ($searcher->mutators as $mutator) {
            $mutator($state, $criteria);
        }

        return $state->getQuery();
    }
}
