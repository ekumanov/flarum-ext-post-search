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

    /**
     * The most words a search term is split into; anything beyond is ignored.
     */
    public const MAX_WORDS = 10;

    /**
     * Restrict the query to posts containing every whitespace-separated word
     * of the search term as a substring.
     *
     * Core's fulltext filter is deliberately not used here. MATCH ... AGAINST
     * makes MySQL prefer the FULLTEXT index over the discussion_id index, so it
     * walks every match across the whole forum before narrowing to one
     * discussion; it also matches whole words only (a half-typed "pian" finds
     * nothing while the client highlighter marks substrings) and ORs the words.
     * A LIKE per word, scoped by discussion_id, only scans that discussion's
     * posts and agrees with the highlighter.
     *
     * posts.content holds the s9e/TextFormatter XML, not plain text, so a word
     * can also match markup (tag names such as URL or attribute values such as
     * a link target). That is accepted: the result is at worst a post whose
     * visible text lacks the word. Text is XML-escaped in storage, so the word
     * is escaped the same way before matching.
     */
    public static function applyTextSearch(Builder $query, string $q): void
    {
        $words = array_slice(preg_split('/\s+/u', trim($q), -1, PREG_SPLIT_NO_EMPTY) ?: [], 0, self::MAX_WORDS);

        foreach ($words as $word) {
            $word = htmlspecialchars($word, ENT_NOQUOTES | ENT_XML1 | ENT_SUBSTITUTE, 'UTF-8');
            $word = strtr($word, ['!' => '!!', '%' => '!%', '_' => '!_']);

            // An explicit, non-backslash ESCAPE character: SQLite has no default
            // one, and a backslash literal is spelled differently in MySQL than
            // in SQLite/PostgreSQL.
            $query->whereRaw(
                $query->getQuery()->getGrammar()->wrap('posts.content')." LIKE ? ESCAPE '!'",
                ['%'.$word.'%']
            );
        }
    }
}
