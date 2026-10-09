# Reading Tracker

A small app where people track the books they read, organise them into shelves and write reviews. Book data comes from Open Library.

## Catalogue

**Book**:
A work as Open Library defines it: the abstract book, such as "Fantastic Mr Fox", whatever the printing. It is identified by its Open Library Work key (for example `OL45804W`).
_Avoid_: Work (outside talk about Open Library), Edition, Title

**Author**:
A person credited as a writer of a Book. A Book can have several Authors. An Author is identified by its Open Library Author key (for example `OL34184A`). The User who wrote a Review is never called its Author.
_Avoid_: Writer, Creator

**ISBN**:
An identifier for one printed edition of a Book. A Book can list many ISBNs. Editions themselves are not modelled.
_Avoid_: Edition ID

## People

**User**:
A person who signs in and tracks books. A User has a public identity (username, display name, bio). Credentials are never part of what others can see.
_Avoid_: Account, Profile, Member, Reader

**Viewer**:
The signed-in User making the current request.
_Avoid_: Current user, Me, Session user

**Follow**:
A one-way relationship in which one User (the follower) subscribes to another User's reading activity. It doesn't need to be returned.
_Avoid_: Friend, Friendship, Connection

## Reading

**Shelf**:
A named list of Books that belongs to one User. A Shelf is either a Custom Shelf or a Status Shelf. Shelves are public.
_Avoid_: List, Collection, Tag

**Custom Shelf**:
A Shelf the User creates, names and deletes, such as "Favourites". A Book can be on any number of Custom Shelves, and at most once on each. Its name is unique among the User's Custom Shelves, but it may match a Status Shelf's name.

**Status Shelf**:
One of three fixed Shelves, "Want to read", "Reading" and "Read", that every User has. It shows the Books whose Reading Status matches, and it can't be renamed or deleted.

**Reading Status**:
Where a User is with a Book: want to read, reading or read. A User has at most one Reading Status per Book, so changing it moves the Book between Status Shelves.
_Avoid_: State, Progress, Shelf (when you mean the status itself)

**Finishing a Book**:
The moment a User's Reading Status for a Book changes to read.
_Avoid_: Completing

**Review**:
A User's opinion of a Book. It always has a Rating and can also have text. A User has at most one Review per Book.
_Avoid_: Comment, Feedback

**Rating**:
A whole-number score from 1 to 5. A Rating only exists as part of a Review.
_Avoid_: Score, Stars
