const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractPath = path.join(__dirname, 'DesignRegistry.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'DesignRegistry.sol': {
            content: source
        }
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode']
            }
        }
    }
};

console.log("Compiling DesignRegistry.sol...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
    output.errors.forEach(err => {
        console.error(err.formattedMessage);
    });
}

const contract = output.contracts['DesignRegistry.sol']['DesignRegistry'];
const bytecode = contract.evm.bytecode.object;

console.log("Compilation Successful!");
console.log("BYTECODE_START");
console.log(bytecode);
console.log("BYTECODE_END");
