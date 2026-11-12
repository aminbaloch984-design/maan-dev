import NewAIApp from '@/components/NewAIApp';
import { SpeechProvider } from '@/components/SpeechProvider';

export default function Home() {
  return (
    <SpeechProvider>
      <NewAIApp />
    </SpeechProvider>
  );
}
