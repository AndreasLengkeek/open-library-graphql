# Only Book and User are entities, and every reference to them from library can be null

Book and User are the only federated entities. catalog owns `Book @key(fields: "id")` (the Open Library Work key) and users owns `User @key(fields: "id")`. library contributes fields to both: `averageRating`, `reviews` and `viewerReadingStatus` on Book, and `shelves` and `reviews` on User. Author, Shelf and Review stay plain types even though they have ids, because each is used by only one subgraph. Making them entities would add reference resolvers that nobody calls. We'll make one an entity only when a second subgraph needs it, as S1 will for Review.

There are no foreign keys across subgraphs, so library can't guarantee that a Book or User it stores an id for will resolve. Every library field that refers to one can therefore be null: `Shelf.books: [Book]!`, `Review.book: Book` and `Review.user: User`. An unknown Book or a missing User nulls one list item or field instead of passing the null up through non-null fields until it wipes out the whole `me` or `book` result. The one exception is `Shelf.user: User!`, because a Shelf is only ever reached through its User.

`setReadingStatus` returns a `ReadingStatusChange` payload rather than the Book. That way the client can update its cached Status Shelves, and the result is still non-null when Open Library doesn't know the Book.
