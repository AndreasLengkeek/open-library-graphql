const WORK_ID = /^OL\d+W$/;

/** True for a bare Open Library Work key, such as `OL45804W`. */
export const isWorkId = (id: string) => WORK_ID.test(id);

/** `/works/OL45804W` → `OL45804W`, `/authors/OL34184A` → `OL34184A`. */
export const stripKey = (key: string) => key.replace(/^\/(works|authors)\//, '');
