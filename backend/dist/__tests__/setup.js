"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Clean up test directories before each test run
const TEST_KEYS_DIR = path.join(__dirname, '../../keys');
const TEST_UPLOADS_DIR = path.join(__dirname, '../../uploads');
beforeAll(() => {
    // Ensure directories exist
    if (!fs.existsSync(TEST_KEYS_DIR)) {
        fs.mkdirSync(TEST_KEYS_DIR, { recursive: true });
    }
    if (!fs.existsSync(TEST_UPLOADS_DIR)) {
        fs.mkdirSync(TEST_UPLOADS_DIR, { recursive: true });
    }
});
afterAll(() => {
    // Final cleanup
    if (fs.existsSync(TEST_KEYS_DIR)) {
        const files = fs.readdirSync(TEST_KEYS_DIR);
        for (const file of files) {
            if (file.startsWith('test-')) {
                fs.unlinkSync(path.join(TEST_KEYS_DIR, file));
            }
        }
    }
});
//# sourceMappingURL=setup.js.map