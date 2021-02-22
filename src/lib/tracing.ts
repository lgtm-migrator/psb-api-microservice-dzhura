/* istanbul ignore file */

import { EventEmitter } from 'events';
import { OpenTelemetryConfigurator } from '@myrotvorets/opentelemetry-configurator';

if (+(process.env.ENABLE_TRACING || 0)) {
    const configurator = new OpenTelemetryConfigurator({
        serviceName: 'psb-api-dzhura',
        instrumentations: [
            {
                plugins: {
                    knex: {
                        path: '@myrotvorets/opentelemetry-plugin-knex',
                    },
                },
            },
        ],
    });

    configurator.start().catch((e) => console.error('Failed to initialize OpenTelemetry:', e));
    EventEmitter.defaultMaxListeners += 5;
}
