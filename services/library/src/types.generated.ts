import type { GraphQLResolveInfo } from 'graphql';
import type { Context } from './context.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
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

export type Book = {
  __typename?: 'Book';
  /** Mean Rating across all Reviews of this Book in this app. Null when it has no Reviews. */
  averageRating?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  /** Reviews of this Book written in this app. */
  reviews: Array<Review>;
  /** The Reading Status of the viewers book. Null when they haven't set one or aren't signed in. */
  viewerReadingStatus?: Maybe<ReadingStatus>;
};

/**
 * A Shelf the User creates, names and deletes, such as "Favourites".
 * The only kind of Shelf the shelf mutations return.
 */
export type CustomShelf = Shelf & {
  __typename?: 'CustomShelf';
  /** Books on the Shelf, newest addition first. An item is null when Open Library no longer knows the Book. */
  books: Array<Maybe<Book>>;
  /** Database ID */
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** The User who owns the Shelf. */
  user: User;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Add a Book to one of the Viewer's Custom Shelves. A Book appears at most once on each Shelf. Status Shelves can't be targeted; use `setReadingStatus`. */
  addToShelf: CustomShelf;
  /** Create a Custom Shelf for the Viewer. Custom Shelf names are unique per User. */
  createShelf: CustomShelf;
  /** Delete one of the Viewer's Reviews. Returns the deleted Review's id. */
  deleteReview: Scalars['ID']['output'];
  /** Delete one of the Viewer's Custom Shelves and its entries. Reading Statuses and Reviews are untouched. Returns the deleted Shelf's id. */
  deleteShelf: Scalars['ID']['output'];
  /** Remove a Book from one of the Viewer's Custom Shelves. */
  removeFromShelf: CustomShelf;
  /** Rename one of the Viewer's Custom Shelves. Status Shelves can't be renamed. */
  renameShelf: CustomShelf;
  /** Set the Viewer's Reading Status for a Book, which moves it between Status Shelves. Pass `status: null` to clear it. Returns what changed, including the Status Shelves the Book left and joined. */
  setReadingStatus: ReadingStatusChange;
  /** Change the Rating or text of one of the Viewer's Reviews. Omitted arguments are left unchanged. */
  updateReview: Review;
  /** Write the Viewer's Review of a Book. Fails if the Viewer has already reviewed it. Doesn't change the Book's Reading Status. */
  writeReview: Review;
};


export type MutationAddToShelfArgs = {
  bookId: Scalars['ID']['input'];
  shelfId: Scalars['ID']['input'];
};


export type MutationCreateShelfArgs = {
  name: Scalars['String']['input'];
};


export type MutationDeleteReviewArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteShelfArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveFromShelfArgs = {
  bookId: Scalars['ID']['input'];
  shelfId: Scalars['ID']['input'];
};


export type MutationRenameShelfArgs = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};


export type MutationSetReadingStatusArgs = {
  bookId: Scalars['ID']['input'];
  status?: InputMaybe<ReadingStatus>;
};


export type MutationUpdateReviewArgs = {
  id: Scalars['ID']['input'];
  rating?: InputMaybe<Scalars['Int']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
};


export type MutationWriteReviewArgs = {
  bookId: Scalars['ID']['input'];
  rating: Scalars['Int']['input'];
  text?: InputMaybe<Scalars['String']['input']>;
};

/**
 * Where a User is with a Book. A User has at most one Reading Status per Book.
 * Changing it to `READ` is Finishing a Book.
 */
export enum ReadingStatus {
  Read = 'READ',
  Reading = 'READING',
  WantToRead = 'WANT_TO_READ'
}

/**
 * The result of `setReadingStatus`: everything a client needs to update its
 * cached Status Shelves without fetching them again.
 */
export type ReadingStatusChange = {
  __typename?: 'ReadingStatusChange';
  /** The Book. Null when Open Library doesn't know it; the change is still saved. */
  book?: Maybe<Book>;
  /** The Book whose Reading Status changed. Present even when Open Library doesn't know the Book. */
  bookId: Scalars['ID']['output'];
  /** The Status Shelf the Book left. Null when it had no Reading Status before. */
  from?: Maybe<StatusShelf>;
  /** The new Reading Status. Null when it was cleared. */
  status?: Maybe<ReadingStatus>;
  /** The Status Shelf the Book joined. Null when the Reading Status was cleared. */
  to?: Maybe<StatusShelf>;
};

/**
 * A User's opinion of a Book. It always has a Rating and can also have text.
 * A User has at most one Review per Book.
 */
export type Review = {
  __typename?: 'Review';
  /** The reviewed Book. Null when Open Library no longer knows it. */
  book?: Maybe<Book>;
  id: Scalars['ID']['output'];
  /** Rating: a whole number from 1 to 5. */
  rating: Scalars['Int']['output'];
  /** The review text. Null when the User gave only a Rating. */
  text?: Maybe<Scalars['String']['output']>;
  /** The User who wrote the Review. Null when users can't resolve them, so one missing User doesn't null the whole Book. */
  user?: Maybe<User>;
};

/**
 * A named list of Books that belongs to one User: either a Custom Shelf or a
 * Status Shelf. Clients tell the kinds apart by `__typename`. Shelves are public.
 */
export type Shelf = {
  /** Books on the Shelf, newest addition first. An item is null when Open Library no longer knows the Book. */
  books: Array<Maybe<Book>>;
  /** A database id for a Custom Shelf. For a Status Shelf it is derived as `status:<userId>:<STATUS>`. */
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** The User who owns the Shelf. */
  user: User;
};

/**
 * One of the three fixed Shelves every User has: "Want to read", "Reading" and
 * "Read". It shows the Books whose Reading Status matches. It can't be renamed,
 * deleted or edited directly; it changes only through `setReadingStatus`.
 */
export type StatusShelf = Shelf & {
  __typename?: 'StatusShelf';
  /** Books on the Shelf, newest addition first. An item is null when Open Library no longer knows the Book. */
  books: Array<Maybe<Book>>;
  /** Derived as `status:<userId>:<STATUS>`. */
  id: Scalars['ID']['output'];
  /** Set by its Reading Status */
  name: Scalars['String']['output'];
  /** The Reading Status whose Books this Shelf shows. */
  readingStatus: ReadingStatus;
  /** The User who owns the Shelf. */
  user: User;
};

export type User = {
  __typename?: 'User';
  id: Scalars['ID']['output'];
  /** Reviews the User has written. */
  reviews: Array<Review>;
  /** The User's three Status Shelves, in the order Want to read, Reading, Read, followed by their Custom Shelves, oldest created first. */
  shelves: Array<Shelf>;
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
  User: User;
};

/** Mapping of federation reference types */
export type FederationReferenceTypes = {
  Book:
    ( { __typename: 'Book' }
    & GraphQLRecursivePick<FederationTypes['Book'], {"id":true}> );
  User:
    ( { __typename: 'User' }
    & GraphQLRecursivePick<FederationTypes['User'], {"id":true}> );
};


/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  Shelf:
    | ( Omit<CustomShelf, 'books' | 'user'> & { books: Array<Maybe<_RefType['Book']>>, user: _RefType['User'] } )
    | ( Omit<StatusShelf, 'books' | 'user'> & { books: Array<Maybe<_RefType['Book']>>, user: _RefType['User'] } )
  ;
};

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Book: ResolverTypeWrapper<Omit<Book, 'reviews'> & { reviews: Array<ResolversTypes['Review']> }>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  CustomShelf: ResolverTypeWrapper<Omit<CustomShelf, 'books' | 'user'> & { books: Array<Maybe<ResolversTypes['Book']>>, user: ResolversTypes['User'] }>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  ReadingStatus: ReadingStatus;
  ReadingStatusChange: ResolverTypeWrapper<Omit<ReadingStatusChange, 'book' | 'from' | 'to'> & { book?: Maybe<ResolversTypes['Book']>, from?: Maybe<ResolversTypes['StatusShelf']>, to?: Maybe<ResolversTypes['StatusShelf']> }>;
  Review: ResolverTypeWrapper<Omit<Review, 'book' | 'user'> & { book?: Maybe<ResolversTypes['Book']>, user?: Maybe<ResolversTypes['User']> }>;
  Shelf: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Shelf']>;
  StatusShelf: ResolverTypeWrapper<Omit<StatusShelf, 'books' | 'user'> & { books: Array<Maybe<ResolversTypes['Book']>>, user: ResolversTypes['User'] }>;
  User: ResolverTypeWrapper<Omit<User, 'reviews' | 'shelves'> & { reviews: Array<ResolversTypes['Review']>, shelves: Array<ResolversTypes['Shelf']> }>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Book: Omit<Book, 'reviews'> & { reviews: Array<ResolversParentTypes['Review']> } | FederationReferenceTypes['Book'];
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  CustomShelf: Omit<CustomShelf, 'books' | 'user'> & { books: Array<Maybe<ResolversParentTypes['Book']>>, user: ResolversParentTypes['User'] };
  String: Scalars['String']['output'];
  Mutation: Record<PropertyKey, never>;
  Int: Scalars['Int']['output'];
  ReadingStatusChange: Omit<ReadingStatusChange, 'book' | 'from' | 'to'> & { book?: Maybe<ResolversParentTypes['Book']>, from?: Maybe<ResolversParentTypes['StatusShelf']>, to?: Maybe<ResolversParentTypes['StatusShelf']> };
  Review: Omit<Review, 'book' | 'user'> & { book?: Maybe<ResolversParentTypes['Book']>, user?: Maybe<ResolversParentTypes['User']> };
  Shelf: ResolversInterfaceTypes<ResolversParentTypes>['Shelf'];
  StatusShelf: Omit<StatusShelf, 'books' | 'user'> & { books: Array<Maybe<ResolversParentTypes['Book']>>, user: ResolversParentTypes['User'] };
  User: Omit<User, 'reviews' | 'shelves'> & { reviews: Array<ResolversParentTypes['Review']>, shelves: Array<ResolversParentTypes['Shelf']> } | FederationReferenceTypes['User'];
  Boolean: Scalars['Boolean']['output'];
};

export type BookResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Book'] = ResolversParentTypes['Book'], FederationReferenceType extends FederationReferenceTypes['Book'] = FederationReferenceTypes['Book']> = {
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Book']> | FederationReferenceType, FederationReferenceType, ContextType>;
  averageRating?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  reviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType>;
  viewerReadingStatus?: Resolver<Maybe<ResolversTypes['ReadingStatus']>, ParentType, ContextType>;
};

export type CustomShelfResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CustomShelf'] = ResolversParentTypes['CustomShelf']> = {
  books?: Resolver<Array<Maybe<ResolversTypes['Book']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  addToShelf?: Resolver<ResolversTypes['CustomShelf'], ParentType, ContextType, RequireFields<MutationAddToShelfArgs, 'bookId' | 'shelfId'>>;
  createShelf?: Resolver<ResolversTypes['CustomShelf'], ParentType, ContextType, RequireFields<MutationCreateShelfArgs, 'name'>>;
  deleteReview?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationDeleteReviewArgs, 'id'>>;
  deleteShelf?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationDeleteShelfArgs, 'id'>>;
  removeFromShelf?: Resolver<ResolversTypes['CustomShelf'], ParentType, ContextType, RequireFields<MutationRemoveFromShelfArgs, 'bookId' | 'shelfId'>>;
  renameShelf?: Resolver<ResolversTypes['CustomShelf'], ParentType, ContextType, RequireFields<MutationRenameShelfArgs, 'id' | 'name'>>;
  setReadingStatus?: Resolver<ResolversTypes['ReadingStatusChange'], ParentType, ContextType, RequireFields<MutationSetReadingStatusArgs, 'bookId'>>;
  updateReview?: Resolver<ResolversTypes['Review'], ParentType, ContextType, RequireFields<MutationUpdateReviewArgs, 'id'>>;
  writeReview?: Resolver<ResolversTypes['Review'], ParentType, ContextType, RequireFields<MutationWriteReviewArgs, 'bookId' | 'rating'>>;
};

export type ReadingStatusChangeResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ReadingStatusChange'] = ResolversParentTypes['ReadingStatusChange']> = {
  book?: Resolver<Maybe<ResolversTypes['Book']>, ParentType, ContextType>;
  bookId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  from?: Resolver<Maybe<ResolversTypes['StatusShelf']>, ParentType, ContextType>;
  status?: Resolver<Maybe<ResolversTypes['ReadingStatus']>, ParentType, ContextType>;
  to?: Resolver<Maybe<ResolversTypes['StatusShelf']>, ParentType, ContextType>;
};

export type ReviewResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Review'] = ResolversParentTypes['Review']> = {
  book?: Resolver<Maybe<ResolversTypes['Book']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  rating?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  text?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
};

export type ShelfResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Shelf'] = ResolversParentTypes['Shelf']> = {
  __resolveType: TypeResolveFn<'CustomShelf' | 'StatusShelf', ParentType, ContextType>;
};

export type StatusShelfResolvers<ContextType = Context, ParentType extends ResolversParentTypes['StatusShelf'] = ResolversParentTypes['StatusShelf']> = {
  books?: Resolver<Array<Maybe<ResolversTypes['Book']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  readingStatus?: Resolver<ResolversTypes['ReadingStatus'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User'], FederationReferenceType extends FederationReferenceTypes['User'] = FederationReferenceTypes['User']> = {
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['User']> | FederationReferenceType, FederationReferenceType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  reviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType>;
  shelves?: Resolver<Array<ResolversTypes['Shelf']>, ParentType, ContextType>;
};

export type Resolvers<ContextType = Context> = {
  Book?: BookResolvers<ContextType>;
  CustomShelf?: CustomShelfResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  ReadingStatusChange?: ReadingStatusChangeResolvers<ContextType>;
  Review?: ReviewResolvers<ContextType>;
  Shelf?: ShelfResolvers<ContextType>;
  StatusShelf?: StatusShelfResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

