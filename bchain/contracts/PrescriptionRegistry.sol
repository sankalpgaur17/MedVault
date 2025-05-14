// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PrescriptionRegistry {
    mapping(bytes32 => bool) private prescriptions;

    function addPrescription(bytes32 prescriptionHash) public {
        require(!prescriptions[prescriptionHash], "Prescription already exists");
        prescriptions[prescriptionHash] = true;
    }

    function checkPrescription(bytes32 prescriptionHash) public view returns (bool) {
        return prescriptions[prescriptionHash];
    }
}
