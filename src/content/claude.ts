import { chatgptAdapter } from './adapters/chatgpt';
import { claudeAdapter } from './adapters/claude';
import { mountSidebar } from './ui/mount';
import { consumePendingPrefill, renderPanel } from './ui/panel';
mountSidebar(claudeAdapter, renderPanel(claudeAdapter, chatgptAdapter));
void consumePendingPrefill(claudeAdapter);
