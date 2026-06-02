import { MemoryContentStore } from '../content-store/memory-store';
import { MemoryMediaStorage } from '../media/storage';

export const demoContentStore = new MemoryContentStore();
export const demoMediaStorage = new MemoryMediaStorage();
