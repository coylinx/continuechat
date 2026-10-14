import { chatgptAdapter } from './adapters/chatgpt';
import { claudeAdapter } from './adapters/claude';
import { boot } from './boot';
void boot(claudeAdapter, chatgptAdapter);
