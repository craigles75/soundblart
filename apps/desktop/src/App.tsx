import { useState } from 'react';
import { AppShell } from './components/AppShell';
import { Studio } from './screens/Studio';
import { Library } from './screens/Library';
import { Folders } from './screens/Folders';
import { Settings } from './screens/Settings';

export type Screen = 'studio' | 'library' | 'folders' | 'settings';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('studio');

  return (
    <AppShell activeScreen={activeScreen} onNavigate={setActiveScreen}>
      {activeScreen === 'studio'   && <Studio />}
      {activeScreen === 'library'  && <Library />}
      {activeScreen === 'folders'  && <Folders />}
      {activeScreen === 'settings' && <Settings />}
    </AppShell>
  );
}
