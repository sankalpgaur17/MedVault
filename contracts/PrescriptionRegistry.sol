// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PrescriptionRegistry {
    mapping(bytes32 => bool) public prescriptions;
    mapping(bytes32 => address) public prescriptionOwners;
    
    event PrescriptionRegistered(bytes32 indexed hash, address indexed owner);
    
    function registerPrescription(bytes32 prescriptionHash) public {
        require(!prescriptions[prescriptionHash], "Prescription already exists");
        prescriptions[prescriptionHash] = true;
        prescriptionOwners[prescriptionHash] = msg.sender;
        emit PrescriptionRegistered(prescriptionHash, msg.sender);
    }
    
    function verifyPrescription(bytes32 prescriptionHash) public view returns (bool) {
        return prescriptions[prescriptionHash];
    }
}
