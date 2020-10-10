import express from 'express';
import request from 'supertest';
import knex from 'knex';
import mockKnex from 'mock-knex';
import { Model } from 'objection';
import { buildKnexConfig } from '../../../src/knexfile';
import { configureApp } from '../../../src/server';
import { attachmentResponse, criminalResponse } from '../../fixtures/queryresponses';
import { resultItems } from '../../fixtures/results';

let app: express.Express;

async function buildApp(): Promise<express.Express> {
    const application = express();
    const db = knex(buildKnexConfig({ MYSQL_DATABASE: 'fake' }));
    mockKnex.mock(db);
    Model.knex(db);
    afterAll(() => mockKnex.unmock(db));
    await configureApp(application);
    return application;
}

afterEach(() => mockKnex.getTracker().uninstall());

beforeAll((done) => {
    buildApp()
        .then((application) => {
            app = application;
            done();
        })
        .catch((e: Error) => {
            done.fail(e);
        });
});

describe('SearchController', () => {
    describe('Error Handling', () => {
        it('should fail the request without s parameter', () => {
            return request(app)
                .get('/search')
                .expect(400)
                .expect(/"code":"BAD_REQUEST"/u);
        });

        it('should fail the request on an empty s', () => {
            return request(app)
                .get('/search?s=')
                .expect(400)
                .expect(/"code":"BAD_REQUEST"/u);
        });

        it('should fail the request if s is not URL-encoded', () => {
            return request(app)
                .get('/search?s=test+test')
                .expect(400)
                .expect(/"code":"BAD_REQUEST"/u);
        });

        it.each([['Medvedev'], ['Medvedev Medvedev'], ['Putin #@Putin'], ['Putin %21%40%23%24%25%5E%26']])(
            'should fail the request if s is invalid (%s)',
            (param: string) => {
                return request(app)
                    .get(`/search?s=${param}`)
                    .expect(400)
                    .expect(/"code":"BAD_SEARCH_TERM"/u);
            },
        );

        it('should return a 404 on non-existing URLs', () => {
            return request(app).get('/admin').expect(404);
        });

        it.each<['post' | 'put' | 'head' | 'delete' | 'patch' | 'options']>([
            ['post'],
            ['put'],
            ['head'],
            ['delete'],
            ['patch'],
            ['options'],
        ])('should return a 405 on disallowed methods (%s)', (method) => {
            return request(app)[method]('/search').expect(405);
        });
    });

    describe('Normal operation', () => {
        it('should return the result in the expected format', () => {
            const tracker = mockKnex.getTracker();
            tracker.on('query', (query, step) => {
                const responses = [criminalResponse, attachmentResponse];
                query.response(responses[step - 1] ?? fail());
            });

            const expected = {
                success: true,
                items: resultItems,
            };

            tracker.install();
            return request(app).get('/search?s=We%20will%20find%20everything').expect(200).expect(expected);
        });
    });
});
