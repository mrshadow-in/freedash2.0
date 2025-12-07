"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = exports.createRedeemCode = exports.createPlan = void 0;
const Plan_1 = __importDefault(require("../models/Plan"));
const RedeemCode_1 = __importDefault(require("../models/RedeemCode"));
const User_1 = __importDefault(require("../models/User"));
const createPlan = async (req, res) => {
    try {
        const plan = await Plan_1.default.create(req.body);
        res.status(201).json(plan);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
};
exports.createPlan = createPlan;
const createRedeemCode = async (req, res) => {
    try {
        const code = await RedeemCode_1.default.create(req.body);
        res.status(201).json(code);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
};
exports.createRedeemCode = createRedeemCode;
const getUsers = async (req, res) => {
    try {
        const users = await User_1.default.find().select('-password_hash');
        res.json(users);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getUsers = getUsers;
