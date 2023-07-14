import { describe, expect, test } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as console from 'console';

let testFiles = []; // Keeping a separate array because I can't get keys to work with the dicitonary?!
let tests = {};

// Recursive is new for node 20 -- that's why we don't auto test on 16/18. We could add something to
// do the same, but it really is not worth the trouble to me personally right now so I'm leaving it
// like this and assuming 20+
const allFiles = fs.readdirSync(__dirname, { recursive: true })

const regexTestFileHeader = /\/\*(.*?)(Steps:.*?\n)(.*?)\*\//s;
const regexStepMatcher = /^- (.*?)$/gm;

//console.log('Printing contents of SmolScriptTests folder:');
//console.log(allFiles);

allFiles.forEach((fileName) => {

  if (fileName.endsWith('.test.smol')) {

    const fileData = fs.readFileSync(path.join(__dirname, fileName)).toString();

    const testFileHeaderMatch = regexTestFileHeader.exec(fileData);

    if (testFileHeaderMatch != null) {

      const stepsBlock = testFileHeaderMatch[3];
      const matchedSteps = stepsBlock.match(regexStepMatcher);

      if (matchedSteps != null) {
        const steps = matchedSteps.map((x) => x.toString());

        tests[fileName] = { fileData: fileData, steps: steps };

        testFiles.push(fileName);
      }
    }
  }
});

const runStepRegex = /- run$/i;
const expectGlobalNumberRegex = /- Expect global (.*?) to be number (\d+(\.{0,1}\d*))/i;
const expectGlobalStringRegex = /- expect global (.*?) to be string (.*)/i;
const expectGlobalBoolRegex = /- expect global (.*?) to be boolean (.*)/i;
const expectGlobalUndefinedRegex = /- expect global (.*?) to be undefined/i;

describe('Automated Test Suite', () => {

  test.each(testFiles)('%s', (fileName) => {

    console.log(fileName);

    const context = { };
    
    vm.createContext(context); // Contextify the object.
    
    const test = tests[fileName];
    
    test.steps.forEach((step) => {

      if (runStepRegex.test(step)) {
        try {
          vm.runInContext(test.fileData, context);
        }
        catch(e) {
          console.log(test.fileData);
          //console.log(vm.decompile());
          //console.log(debugLog);
          throw e;
        }
      }
      else if (expectGlobalNumberRegex.test(step)) {
        const m = step.match(expectGlobalNumberRegex);

        expect(context[m[1]]).toBe(Number(m[2]));        
      }
      else if (expectGlobalStringRegex.test(step)) {
        const m = step.match(expectGlobalStringRegex);

        expect(context[m[1]]).toBe(String(m[2]));  
      }
      else if (expectGlobalBoolRegex.test(step)) {
        const m = step.match(expectGlobalBoolRegex);

        expect(context[m[1]]).toBe(m[2].toLowerCase() == 'true');
      }
      else if (expectGlobalUndefinedRegex.test(step)) {
        const m = step.match(expectGlobalUndefinedRegex);

        expect(context[m[1]]).toBeUndefined();
      }
      else {
        throw new Error(`Could not parse ${step}`);
      }
    });

  })
});
