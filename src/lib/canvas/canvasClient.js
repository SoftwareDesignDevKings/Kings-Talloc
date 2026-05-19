import 'server-only';

const DEFAULT_RETRIES = 3;
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseLinkHeader = (header) => {
    if (!header) return {};
    return header.split(',').reduce((links, part) => {
        const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
        if (match) links[match[2]] = match[1];
        return links;
    }, {});
};

const appendParams = (url, params = {}) => {
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
            value.forEach((item) => url.searchParams.append(key, item));
        } else {
            url.searchParams.set(key, value);
        }
    }
};

export class CanvasApiError extends Error {
    constructor(message, { status, body } = {}) {
        super(message);
        this.name = 'CanvasApiError';
        this.status = status;
        this.body = body;
    }
}

export class CanvasClient {
    constructor({
        apiUrl = process.env.CANVAS_API_URL,
        token = process.env.CANVAS_API_TOKEN,
        fetchImpl = fetch,
        retries = DEFAULT_RETRIES,
    } = {}) {
        if (!apiUrl || !token) {
            throw new CanvasApiError('Canvas configuration is missing. Set CANVAS_API_URL and CANVAS_API_TOKEN.');
        }
        this.apiUrl = apiUrl.replace(/\/$/, '');
        this.token = token;
        this.fetchImpl = fetchImpl;
        this.retries = retries;
    }

    async request(pathOrUrl, params = {}) {
        const url = pathOrUrl.startsWith('http')
            ? new URL(pathOrUrl)
            : new URL(`${this.apiUrl}${pathOrUrl}`);
        appendParams(url, params);

        for (let attempt = 0; attempt <= this.retries; attempt += 1) {
            const response = await this.fetchImpl(url, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    Accept: 'application/json',
                },
            });

            const shouldRetry =
                RETRY_STATUSES.has(response.status) ||
                (response.status === 403 && response.headers.get('x-rate-limit-remaining') === '0');

            if (shouldRetry && attempt < this.retries) {
                const retryAfter = Number(response.headers.get('retry-after'));
                const delayMs = Number.isFinite(retryAfter)
                    ? retryAfter * 1000
                    : 500 * 2 ** attempt;
                await sleep(delayMs);
                continue;
            }

            if (!response.ok) {
                const body = await response.text().catch(() => '');
                throw new CanvasApiError(`Canvas request failed: ${response.status}`, {
                    status: response.status,
                    body,
                });
            }

            return response;
        }

        throw new CanvasApiError('Canvas request failed after retries.');
    }

    async getPaginated(path, params = {}) {
        const results = [];
        let nextUrl = null;

        do {
            const response = await this.request(nextUrl || path, nextUrl ? {} : params);
            const json = await response.json();
            if (Array.isArray(json)) {
                results.push(...json);
            } else if (json) {
                results.push(json);
            }
            const links = parseLinkHeader(response.headers.get('link'));
            nextUrl = links.next || null;
        } while (nextUrl);

        return results;
    }

    async listCourses() {
        const directCourses = await this.getPaginated('/api/v1/courses', {
            enrollment_type: 'teacher',
            per_page: 100,
            'include[]': ['total_students', 'term'],
        });
        if (directCourses.length > 0) return dedupeCourses(directCourses);

        const manageableAccounts = await this.getPaginated('/api/v1/manageable_accounts', {
            per_page: 100,
        }).catch(() => []);
        const accounts = manageableAccounts.length > 0
            ? manageableAccounts
            : await this.getPaginated('/api/v1/accounts', { per_page: 100 }).catch(() => []);

        const courses = [];
        for (const account of accounts) {
            const accountCourses = await this.getPaginated(`/api/v1/accounts/${account.id}/courses`, {
                per_page: 100,
                'include[]': ['total_students', 'term'],
            });
            courses.push(...accountCourses);
        }
        return dedupeCourses(courses);
    }

    async listStudentEnrollments(courseId) {
        return this.getPaginated(`/api/v1/courses/${courseId}/enrollments`, {
            'type[]': ['StudentEnrollment'],
            'state[]': ['active'],
            'include[]': ['grades', 'email'],
            per_page: 100,
        });
    }

    async listBlueprintSubscriptions(courseId) {
        return this.getPaginated(`/api/v1/courses/${courseId}/blueprint_subscriptions`, {
            per_page: 100,
        }).catch((error) => {
            if (error.status === 404 || error.status === 403) return [];
            throw error;
        });
    }
}

const dedupeCourses = (courses) => {
    const byId = new Map();
    for (const course of courses) {
        if (course?.id !== undefined && course?.id !== null) {
            byId.set(String(course.id), course);
        }
    }
    return [...byId.values()];
};

export const createCanvasClient = () => new CanvasClient();
