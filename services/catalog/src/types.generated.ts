import type { GraphQLResolveInfo } from 'graphql';
import type { Context } from './context.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  _FieldSet: { input: unknown; output: unknown; }
};

/** A person credited as a writer of a Book, identified by an Open Library Author key. */
export type Author = {
  __typename?: 'Author';
  /** Biography from Open Library. Null when it has none. */
  bio?: Maybe<Scalars['String']['output']>;
  /** Birth date as Open Library records it. Free text, such as `1920` or `8 October 1920`, not an ISO date. */
  birthDate?: Maybe<Scalars['String']['output']>;
  /** Books this Author is credited on. */
  books: Array<Maybe<Book>>;
  /** Open Library Author key, such as `OL34184A`. */
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/**
 * A work as Open Library defines it: the abstract book, whatever the printing.
 * Owned by catalog. library contributes `averageRating` and `reviews`.
 */
export type Book = {
  __typename?: 'Book';
  /** Authors credited as writers of this Book. */
  authors: Array<Author>;
  /** URL of a cover image from the Open Library Covers API. Null when the Book has no cover. */
  coverUrl?: Maybe<Scalars['String']['output']>;
  /** Open Library's summary of the Book. Null when it has none. */
  description?: Maybe<Scalars['String']['output']>;
  /** Year the Book was first published. Null when Open Library doesn't record it. */
  firstPublishYear?: Maybe<Scalars['Int']['output']>;
  /** Open Library Work key without the `/works/` prefix, such as `OL45804W`. */
  id: Scalars['ID']['output'];
  /** ISBNs of the Book's printed editions. Editions themselves aren't modelled. */
  isbns: Array<Scalars['String']['output']>;
  /** Open Library subject headings, such as `Science fiction`. */
  subjects: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** One Book by its Open Library Work key, such as `OL45804W`. Null when Open Library doesn't know the key. */
  book?: Maybe<Book>;
  /** Search Open Library for Books matching free text, such as a title or an Author's name. Returns at most `first` Books. */
  searchBooks: Array<Book>;
};


export type QueryBookArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySearchBooksArgs = {
  first: Scalars['Int']['input'];
  query: Scalars['String']['input'];
};



export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ReferenceResolver<TResult, TReference, TContext> = (
      reference: TReference,
      context: TContext,
      info: GraphQLResolveInfo
    ) => Promise<TResult> | TResult;

      type ScalarCheck<T, S> = S extends true ? T : NullableCheck<T, S>;
      type NullableCheck<T, S> = Maybe<T> extends T ? Maybe<ListCheck<NonNullable<T>, S>> : ListCheck<T, S>;
      type ListCheck<T, S> = T extends (infer U)[] ? NullableCheck<U, S>[] : GraphQLRecursivePick<T, S>;
      export type GraphQLRecursivePick<T, S> = { [K in keyof T & keyof S]: ScalarCheck<T[K], S[K]> };
    

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping of federation types */
export type FederationTypes = {
  Book: Book;
};

/** Mapping of federation reference types */
export type FederationReferenceTypes = {
  Book:
    ( { __typename: 'Book' }
    & GraphQLRecursivePick<FederationTypes['Book'], {"id":true}> );
};



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Author: ResolverTypeWrapper<Author>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Book: ResolverTypeWrapper<Book>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Author: Author;
  String: Scalars['String']['output'];
  ID: Scalars['ID']['output'];
  Book: Book | FederationReferenceTypes['Book'];
  Int: Scalars['Int']['output'];
  Query: Record<PropertyKey, never>;
  Boolean: Scalars['Boolean']['output'];
};

export type AuthorResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Author'] = ResolversParentTypes['Author']> = {
  bio?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  birthDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  books?: Resolver<Array<Maybe<ResolversTypes['Book']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type BookResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Book'] = ResolversParentTypes['Book'], FederationReferenceType extends FederationReferenceTypes['Book'] = FederationReferenceTypes['Book']> = {
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Book']> | FederationReferenceType, FederationReferenceType, ContextType>;
  authors?: Resolver<Array<ResolversTypes['Author']>, ParentType, ContextType>;
  coverUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  firstPublishYear?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isbns?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  subjects?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  book?: Resolver<Maybe<ResolversTypes['Book']>, ParentType, ContextType, RequireFields<QueryBookArgs, 'id'>>;
  searchBooks?: Resolver<Array<ResolversTypes['Book']>, ParentType, ContextType, RequireFields<QuerySearchBooksArgs, 'first' | 'query'>>;
};

export type Resolvers<ContextType = Context> = {
  Author?: AuthorResolvers<ContextType>;
  Book?: BookResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
};

