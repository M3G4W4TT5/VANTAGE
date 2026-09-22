import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HotkeysProvider } from '@blueprintjs/core';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import '@blueprintjs/select/lib/css/blueprint-select.css';
import '@blueprintjs/datetime/lib/css/blueprint-datetime.css';
import '@blueprintjs/table/lib/css/table.css';
import './platform/ui/tokens.css';
import './platform/ui/blueprint.css';
import { AppRegistry } from './platform/registry/AppRegistry';
import { SessionGate } from './platform/session/SessionGate';
import { atlasModule } from './apps/atlas/atlasModule';

import { SourceServicesContext } from './platform/sources/SourceServices';
import * as sources from './connectors/sourceRegistration';

const registry = new AppRegistry();
registry.register(atlasModule);
createRoot(document.getElementById('root')!).render(<StrictMode><HotkeysProvider><SourceServicesContext value={sources}><SessionGate registry={registry} /></SourceServicesContext></HotkeysProvider></StrictMode>);
