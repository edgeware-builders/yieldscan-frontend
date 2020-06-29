import { Filter, ChevronDown, ChevronUp } from "react-feather";
import { useState, useEffect } from "react";
import { useDisclosure, Select } from "@chakra-ui/core";
import { mapValues, keyBy, isNil, get, orderBy, filter } from "lodash";
import { useTransaction, useAccounts } from "@lib/store";
import calculateReward from "@lib/calculate-reward";
import ValidatorsResult from "./ValidatorsResult";
import ValidatorsTable from "./ValidatorsTable";
import EditAmountModal from "./EditAmountModal";
import FilterPanel from "./FilterPanel";

const DEFAULT_FILTER_OPTIONS = {
	numOfNominators: { min: '', max: '' },
	riskScore: '',
	ownStake: { min: '', max: '' },
	totalStake: { min: '', max: '' },
	commission: '',
};

const Validators = () => {
	const { bondedAmount } = useAccounts();
	const { isOpen, onClose, onToggle } = useDisclosure();
	const transactionState = useTransaction();
	
	const [validators, setValidators] = useState(get(transactionState.validatorMap, 'total'));
	const [filteredValidators, setFilteredValidators] = useState(validators);
	const [amount, setAmount] = useState(transactionState.stakingAmount);
	const [timePeriodValue, setTimePeriod] = useState(transactionState.timePeriodValue);
	const [timePeriodUnit, setTimePeriodUnit] = useState(transactionState.timePeriodUnit || 'months');
	const [selectedValidatorsMap, setSelectedValidatorsMap] = useState(
		mapValues(keyBy(transactionState.selectedValidators, 'stashId'))
	);

	const [filterPanelOpen, setFilterPanelOpen] = useState(false);
	const [filterOptions, setFilterOptions] = useState(DEFAULT_FILTER_OPTIONS);
	const [sortOrder, setSortOrder] = useState('asc');
	const [sortKey, setSortKey] = useState('estimatedPoolReward');
	const [result, setResult] = useState({});

	useEffect(() => {
		const sorted = orderBy(validators, [sortKey], [sortOrder]);
		setValidators(sorted);
	}, [sortKey, sortOrder]);

	useEffect(() => {
		// console.log(transactionState);
	}, [transactionState]);

	useEffect(() => {
		if (!filterPanelOpen) return setFilteredValidators(validators);
		// console.log(filterPanelOpen);

		const riskGroup = get(filterOptions, 'riskScore');
		const commission = get(filterOptions, 'commission');
		const numOfNominators = get(filterOptions, 'numOfNominators', { min: '', max: '' });
		const ownStake = get(filterOptions, 'ownStake', { min: '', max: '' });
		const totalStake = get(filterOptions, 'totalStake', { min: '', max: '' });

		const filtered = validators.filter(validator => {
			if (riskGroup === 'Low' && validator.riskScore < 0.33) return true;
			if (riskGroup === 'Medium' && (validator.riskScore >= 0.33 && validator.riskScore <= 0.66)) return true;
			if (riskGroup === 'High' && validator.riskScore > 0.66) return true;

			if (!isNil(commission) && validator.commission <= commission) return true;

			const isNilNotZero = (num) => isNil(num) && num !== 0;

			if (isNilNotZero(numOfNominators.min) && validator.numOfNominators >= numOfNominators.min) return true;
			if (isNilNotZero(numOfNominators.max) && validator.numOfNominators <= numOfNominators.max) return true;

			if (isNilNotZero(ownStake.min) && validator.ownStake >= ownStake.min) return true;
			if (isNilNotZero(ownStake.max) && validator.ownStake <= ownStake.max) return true;

			if (isNilNotZero(totalStake.min) && validator.totalStake >= totalStake.min) return true;
			if (isNilNotZero(totalStake.max) && validator.totalStake <= totalStake.max) return true;

			return false;
		});

		// console.log(filtered);
		setFilteredValidators(filtered);
	}, [filterPanelOpen, filterOptions]);

	useEffect(() => {
		if (amount && timePeriodValue && timePeriodUnit) {
			const selectedValidatorsList = Object.values(selectedValidatorsMap).filter(v => !isNil(v));
			calculateReward(
				selectedValidatorsList,
				amount,
				timePeriodValue,
				timePeriodUnit,
				true,
				bondedAmount,
			).then(setResult).catch(error => {
				// TODO: handle error gracefully with UI toast
				alert(error);
			});
		}
	}, [amount, timePeriodValue, timePeriodUnit, selectedValidatorsMap])

	return (
		<div className="px-10 py-5">
			<EditAmountModal
				isOpen={isOpen}
				onClose={onClose}
				amount={amount}
				setAmount={setAmount}
				bondedAmount={bondedAmount}
			/>
			<ValidatorsResult
				stakingAmount={amount}
				bondedAmount={bondedAmount}
				timePeriodValue={timePeriodValue}
				timePeriodUnit={timePeriodUnit}
				onTimePeriodValueChange={setTimePeriod}
				onTimePeriodUnitChange={setTimePeriodUnit}
				onEditAmount={onToggle}
				result={result}
				transactionState={transactionState}
			/>
			<div className="flex justify-between items-center mt-10">
				<div className="flex items-center">
					<span className="text-gray-700 mr-4">Sort by</span>
					<Select
						rounded="full"
						border="1px"
						borderColor="gray.500"
						color="gray.800"
						pl="1rem"
						width="14rem"
						fontSize="xs"
						cursor="pointer"
						height="2rem"
						defaultValue="estimatedPoolReward"
						value={sortKey}
						onChange={ev => setSortKey(ev.target.value)}
					>
						<option value="estimatedPoolReward">Estimated Rewards</option>
						<option value="riskScore">Risk Score</option>
						<option value="commission">Commission</option>
						<option value="numOfNominators">Nominators</option>
						<option value="totalStake">Other Stake</option>
					</Select>
					<div className="flex flex-col items-center justify-between items-center ml-2">
						<ChevronUp size="20px" className="bg-gray-300 cursor-pointer" onClick={() => setSortOrder('asc')} />
						<ChevronDown size="20px" className="bg-gray-300 cursor-pointer" onClick={() => setSortOrder('desc')} />
					</div>
				</div>
				<div>
					<button
						className={`
							flex items-center select-none rounded-xl px-3 py-1
							${filterPanelOpen ? 'bg-gray-900 text-white' : 'border border-gray-900 text-gray-900'}
						`}
						onClick={() => setFilterPanelOpen(!filterPanelOpen)}
					>
						<Filter size="1rem" className="mr-2" />
						<span>Filter</span>
					</button>
				</div>
			</div>
			<div className="mt-5" hidden={!filterPanelOpen}>
				<FilterPanel
					filterOptions={filterOptions}
					setFilterOptions={setFilterOptions}
				/>
			</div>
			<ValidatorsTable
				validators={filteredValidators}
				selectedValidatorsMap={selectedValidatorsMap}
				setSelectedValidators={setSelectedValidatorsMap}
			/>
		</div>
	);
}

export default Validators;