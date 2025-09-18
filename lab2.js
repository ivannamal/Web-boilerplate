export const COURSES = [
    "Mathematics","Physics","English","Computer Science","Dancing","Chess",
    "Biology","Chemistry","Law","Art","Medicine","Statistics"
];

const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];
const makeFirstLetterCapital = (s) => typeof s === "string" ? s.slice(0,1).toUpperCase()+s.slice(1) : s;
const currentYear = new Date().getFullYear();
const genId = () => crypto.randomUUID();
const randomHexColor = () =>
    "#"+[0,0,0].map(()=>Math.floor(Math.random()*256).toString(16).padStart(2,"0")).join("");
const isHex = (s) => typeof s === "string" && /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(s);

function normalizeCourse(course) {
    if (typeof course === "string") {
        const hit = COURSES.find(c => c.toLowerCase() === course.toLowerCase());
        if (hit) return hit;
    }
    return sample(COURSES);
}

function ageFromDate(iso) {
    if (!iso) return undefined;
    const d = new Date(iso);
    if (Number.isNaN(+d)) return undefined;
    let age = currentYear - d.getFullYear();
    const md = new Date(currentYear, d.getMonth(), d.getDate());
    if (md > new Date()) age -= 1;
    return age;
}

// Завдання 1 — нормалізація + merge
function fromRandomUser(u) {
    return {
        // нові поля
        id: u?.login?.uuid || genId(),
        favorite: false,
        course: normalizeCourse(),
        bg_color: randomHexColor(),
        note: "Empty note.",

        // старі поля
        gender: makeFirstLetterCapital(u.gender),
        title: u?.name?.title,
        full_name: [u?.name?.first, u?.name?.last].filter(Boolean).join(" "),
        city: u?.location?.city,
        state: u?.location?.state,
        country: u?.location?.country,
        postcode: u?.location?.postcode,
        coordinates: u?.location?.coordinates
            ? { latitude: String(u.location.coordinates.latitude), longitude: String(u.location.coordinates.longitude) }
            : undefined,
        timezone: u?.location?.timezone
            ? { offset: u.location.timezone.offset, description: u.location.timezone.description }
            : undefined,
        email: u?.email,
        b_date: u?.dob?.date,
        age: u?.dob?.age,
        phone: u?.phone,
        picture_large: u?.picture?.large,
        picture_thumbnail: u?.picture?.thumbnail,
    };
}

function fromAdditionalUser(u) {
    const b_date = u.b_day || u.b_date;
    return {
        id: typeof u.id === "string" && u.id ? u.id : genId(),
        favorite: Boolean(u.favorite),
        course: normalizeCourse(u.course),
        bg_color: isHex(u.bg_color) ? u.bg_color : randomHexColor(),
        note: typeof u.note === "string" ? u.note : "Empty note.",

        gender: makeFirstLetterCapital(u.gender),
        title: u.title,
        full_name: u.full_name,
        city: u.city,
        state: u.state,
        country: u.country,
        postcode: u.postcode,
        coordinates: u.coordinates ? { latitude: String(u.coordinates.latitude), longitude: String(u.coordinates.longitude) } : undefined,
        timezone: u.timezone ? { offset: u.timezone.offset, description: u.timezone.description } : undefined,
        email: u.email,
        b_date,
        age: typeof u.age === "number" ? u.age : ageFromDate(b_date),
        phone: u.phone,
        picture_large: u.picture_large,
        picture_thumbnail: u.picture_thumbnail,
    };
}

/** ключ для дедуплікації (email > full_name+country > full_name) */
function uniqueComposedKey(u) {
    if (u.email) return `email:${u.email.toLowerCase()}`;
    if (u.full_name && u.country) return `nameCountry:${u.full_name.toLowerCase()}|${u.country.toLowerCase()}`;
    if (u.full_name) return `name:${u.full_name.toLowerCase()}`;
    return `fallback:${u.id}`;
}

/**
 Мердж користувачів з двох масивів
 */
export function buildUsers(randomUserMock = [], additionalUsers = []) {
    const a = (randomUserMock || []).map(fromRandomUser);
    const b = (additionalUsers || []).map(fromAdditionalUser);

    const byKey = new Map();
    [...a, ...b].forEach((u) => {
        const k = uniqueComposedKey(u); //email > full_name+country > full_name
        if (!byKey.has(k)) { //в це розгалудження потрапляє все з randomUserMock
            byKey.set(k, u);
        } else { // а тут additionalUsers які вже були в randomUserMock
            const prev = byKey.get(k); //значення за k
            // розумне злиття: брати те, що не порожнє
            byKey.set(k, {
                ...prev, // тут значення з u перезапишуть однойменні з prev (для одного айтема)
                ...Object.fromEntries(
                    Object.entries(u).filter(([, val]) =>
                        val !== undefined && val !== null && val !== ""
                    )
                ),
                // пріоритет для favorite: якщо хоча б десь true
                favorite: Boolean(prev.favorite || u.favorite),
            });
        }
    });

    return [...byKey.values()];
}

//Завдання 2 — валідація об’єкта

const PHONE_PATTERNS = {
    "Germany": /^(?:\+49|0)[\d\s\-()]{8,}$/,
    "Ireland": /^(?:\+353|0)\d{2}-\d{3}-\d{4}$/,
    "Australia": /^(?:\+61|0)\d{1,2}-\d{3,4}-\d{3,4}$/,
    "United States": /^\+?1?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}$/,
    "Canada": /^\+?1?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}$/,
    "Finland": /^(?:\+358|0)\d(?:[-\s]?\d{2,3}){2,4}$/,
    "Turkey": /^\(\d{3}\)-\d{3}-\d{4}$/,
    "Switzerland": /^(?:\+41|0)\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/,
    "Norway": /^(?:\+47)?\s?\d{8}$/,
    "Spain": /^\d{3}-\d{3}-\d{3}$/,
    "New Zealand": /^\(0\d{2}\)-\d{3}-\d{4}$/,
    "Denmark": /^(?:\+45)?\s?\d{8}$/,
    "Netherlands": /^(?:\(\d{3}\)-\d{3}-\d{4}|(?:\+31|0)\d{9,10})$/,
    "Iran": /^\d{3,4}-\d{3}-\d{4}$/,
    "France": /^(?:\+33|0)\d(?:-\d{2}){4}$/ ,
};

export function validateUser(user) {
    const errors = [];
    const u = user || {};

    const mustBeCapital = ["full_name","gender","note","state","city","country"];
    for (const k of mustBeCapital) {
        const v = u[k];
        if (typeof v !== "string" || !v.trim()) { // v.trim видаляє пробіли/табуляції/переноси на початку й в кінці рядка
            errors.push(`${k} має бути непорожнім рядком`);
            continue;
        }
        const first = v.trim()[0];
        if (first !== first.toUpperCase()) { // ""=="".toUpperCase()
            errors.push(`${k} має починатись з великої літери`);
        }
    }

    if (typeof u.age !== "number" || Number.isNaN(u.age)) {
        errors.push("age має бути числом");
    }

    if (typeof u.email !== "string" || !u.email.includes("@")) {
        errors.push("email має містити '@'");
    }

    const phone = String(u.phone ?? "");
    const country = String(u.country ?? "");
    const pattern = PHONE_PATTERNS[country] || /^[+()\- \d]{7,}$/;
    if (!pattern.test(phone)) {
        errors.push(`phone не відповідає формату країни "${country || "N/A"}"`);
    }

    return { valid: errors.length === 0, errors };
}

//  Завдання 3 — фільтрація (логічне "І")
/** params: { country?, age?, gender?, favorite? } */
export function filterUsers(users, params = {}) {
    const { country, age, gender, favorite } = params;
    return (users || []).filter((u) => {
        if (country !== undefined && String(u.country).toLowerCase() !== String(country).toLowerCase()) return false;
        if (age !== undefined && Number(u.age) !== Number(age)) return false;
        if (gender !== undefined && String(u.gender).toLowerCase() !== String(gender).toLowerCase()) return false;
        if (favorite !== undefined && Boolean(u.favorite) !== Boolean(favorite)) return false;
        return true;
    });
}

//Завдання 4 — сортування (один параметр)
/** key: 'full_name' | 'age' | 'b_day' | 'b_date' | 'country'; order: 'asc'|'desc' */
export function sortUsers(users, key, order = "asc") {
    if (!Array.isArray(users)) return [];
    const dir = order === "desc" ? -1 : 1;
    const k = key === "b_day" ? "b_date" : key;

    return [...users].sort((a, b) => {
        const A = a?.[k], B = b?.[k];
        // дати
        if (k === "b_date") {
            const ta = A ? Date.parse(A) : 0;
            const tb = B ? Date.parse(B) : 0;
            return (ta - tb) * dir;
        }
        // числа
        if (typeof A === "number" || typeof B === "number") {
            return ((Number(A) || 0) - (Number(B) || 0)) * dir;
        }
        // рядки
        const sa = (A ?? "").toString().toLowerCase();
        const sb = (B ?? "").toString().toLowerCase();
        if (sa < sb) return -1 * dir;
        if (sa > sb) return  1 * dir;
        return 0;
    });
}

// Завдання 5 — пошук одного елемента
/** field: 'name'(=full_name) | 'note' | 'age' */
export function findUser(users, field, value) {
    const key = field === "name" ? "full_name" : field;
    const isNum = typeof value === "number";
    return (users || []).find((u) => {
        const v = u?.[key];
        if (isNum) return Number(v) === value;
        if (typeof v !== "string") return false;
        return v.toLowerCase().includes(String(value).toLowerCase());
    }) || null;
}

// Завдання 6 — відсоток збігів
/** predicate: (u) => boolean, повертає ціле число 0..100 */
export function matchPercentage(users, predicate) {
    if (!Array.isArray(users) || users.length === 0) return 0;
    let m = 0;
    for (const u of users) if (predicate(u)) m++;
    return Math.round((m / users.length) * 100);
}

// Програма
 import { randomUserMock, additionalUsers } from "./FE4U-Lab2-mock.js";

const USERS = buildUsers(randomUserMock, additionalUsers);
console.log("К-сть користувачів:", USERS.length);
//console.log("1-й користувач:", USERS[0]);

// Валідація конкретного об’єкта:
//console.log("Валідація:", validateUser(USERS[0]));

let validatedUsers = []
for (const z of USERS){
    if(validateUser(z).valid){
        validatedUsers.push(z)
    }
}
//console.log("Validated users: ", validatedUsers)

// Фільтрація:
//console.log("Germany & Female:", filterUsers(USERS, { country: "Germany", gender: "Female" }));

// Сортування:
console.log("За full_name ASC, перші 3:", sortUsers(USERS, "full_name", "asc").slice(0,3).map(u=>u.full_name));

// Пошук:
console.log("Пошук по name ~ 'Norbert':", findUser(USERS, "name", "Norbert"));

// Відсоток віком > 30:
console.log("% віком >30:", matchPercentage(USERS, u => Number(u.age) > 30));
