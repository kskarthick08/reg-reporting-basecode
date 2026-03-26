-- Auto-generated from PSD008_Logical_Data_Model_Proposed.xlsx
-- Dialect: generic SQL (SQLite/Postgres-friendly baseline)

CREATE TABLE IF NOT EXISTS dim_reporting_firm (
    firm_reference_number TEXT NOT NULL,
    reporting_firm_id TEXT NOT NULL,
    PRIMARY KEY (reporting_firm_id)
);

CREATE TABLE IF NOT EXISTS fact_credit_agreement_sale (
    has_a_default_notice_taken_effect_in_relation_to_this_agreem BOOLEAN,
    transaction_reference_regulated_mortgage_contracts_and_relev TEXT,
    origination_agreement_type TEXT,
    agreement_execution_date DATE,
    date_of_assignment_of_legal_ownership DATE,
    credit_for_business_or_personal_use TEXT,
    agreement_characteristics_id TEXT,
    agreement_duration_id TEXT,
    credit_broker_id TEXT,
    creditworthiness_assessment_id TEXT,
    origination_context_id TEXT,
    p2p_platform_operator_id TEXT,
    penalty_charges_id TEXT,
    related_product_id TEXT,
    repayment_terms_id TEXT,
    reporting_firm_id TEXT NOT NULL,
    running_account_usage_id TEXT,
    security_id TEXT,
    total_amount_of_credit_id TEXT,
    total_charge_for_credit_id TEXT,
    credit_agreement_sale_id TEXT NOT NULL,
    PRIMARY KEY (credit_agreement_sale_id)
);

CREATE TABLE IF NOT EXISTS dim_origination_context (
    earlier_agreement_transaction_reference_status TEXT,
    earlier_agreement_transaction_reference TEXT,
    previous_lender_regulatory_status TEXT,
    previous_lender_frn TEXT,
    previous_lender_name TEXT,
    origination_context_id TEXT NOT NULL,
    PRIMARY KEY (origination_context_id)
);

CREATE TABLE IF NOT EXISTS dim_related_product (
    was_a_brand_name_used_other_than_the_reporting_firm_s_name BOOLEAN,
    does_the_agreement_use_a_brand_that_represents_the_reporting INTEGER,
    brand_name_used_for_the_agreement TEXT,
    is_the_product_only_available_to_a_particular_class_of_indiv TEXT,
    were_there_any_financial_promotions_for_the_related_product TEXT,
    representative_apr_used_in_financial_promotions_for_the_rela DECIMAL(7,4),
    internal_reference_for_related_product TEXT,
    related_product_name TEXT,
    related_product_id TEXT NOT NULL,
    PRIMARY KEY (related_product_id)
);

CREATE TABLE IF NOT EXISTS dim_credit_broker (
    did_another_person_effect_an_introduction_of_the_borrower_s BOOLEAN,
    credit_broker_frn TEXT,
    credit_broker_name TEXT,
    commission_paid_by_reporting_firm_to_credit_broker DECIMAL(18,2),
    commission_received_by_reporting_firm_from_credit_broker DECIMAL(18,2),
    credit_broker_id TEXT NOT NULL,
    PRIMARY KEY (credit_broker_id)
);

CREATE TABLE IF NOT EXISTS dim_p2p_platform_operator (
    is_the_credit_agreement_also_a_p2p_agreement BOOLEAN,
    p2p_platform_operator_frn TEXT,
    p2p_platform_operator_name TEXT,
    p2p_platform_operator_id TEXT NOT NULL,
    PRIMARY KEY (p2p_platform_operator_id)
);

CREATE TABLE IF NOT EXISTS dim_agreement_duration (
    is_the_agreement_an_open_end_agreement BOOLEAN,
    agreement_end_date DATE,
    is_there_a_minimum_duration_for_the_open_end_agreement BOOLEAN,
    minimum_duration_end_date DATE,
    agreement_duration_id TEXT NOT NULL,
    PRIMARY KEY (agreement_duration_id)
);

CREATE TABLE IF NOT EXISTS dim_agreement_characterist (
    do_any_financial_promotions_for_the_related_product_make_ref BOOLEAN,
    how_the_sale_was_made INTEGER,
    postcode_of_trade_premises_where_sale_was_made TEXT,
    is_the_agreement_a_credit_token_agreement BOOLEAN,
    is_the_facility_under_the_credit_agreement_fixed_sum_or_runn INTEGER,
    how_can_the_running_account_credit_be_used INTEGER,
    payment_network DECIMAL(18,2),
    with_which_suppliers_can_the_running_account_credit_be_used INTEGER,
    regulatory_status_of_the_supplier_in_respect_of_whom_the_run INTEGER,
    running_account_credit_supplier_frn INTEGER,
    running_account_credit_supplier_name INTEGER,
    is_the_agreement_a_bnpl_agreement BOOLEAN,
    type_of_periodic_premiums_or_fees DECIMAL(18,2),
    is_the_agreement_a_borrower_lender_agreement_or_a_borrower_l TEXT,
    supplier_regulatory_status TEXT,
    supplier_frn TEXT,
    supplier_name TEXT,
    is_the_agreement_one_of_these_specific_contract_types TEXT,
    does_the_agreement_meet_the_criteria_of_one_of_these_agreeme TEXT,
    end_date_of_promotional_period_for_bnpl_credit DATE,
    type_of_goods_or_services_provided_by_the_supplier_financed TEXT,
    was_the_motor_vehicle_financed_new_or_used TEXT,
    type_of_motor_vehicle_financed TEXT,
    is_the_hire_purchase_agreement_a_personal_contract_purchase BOOLEAN,
    guaranteed_minimum_future_value DECIMAL(18,2),
    anticipated_annual_mileage TEXT,
    declared_purpose_of_borrowing TEXT,
    was_any_portion_of_the_loan_for_direct_payment_to_existing_c DECIMAL(18,2),
    value_of_direct_payments_to_existing_creditors DECIMAL(18,2),
    reporting_firm_s_unique_reference_for_natural_person_acting TEXT,
    guarantor_s_date_of_birth DATE,
    guarantor_s_residential_address_type TEXT,
    guarantor_s_residential_postcode_on_the_agreement_execution DATE,
    guarantor_s_residential_status_on_the_agreement_execution_da DATE,
    guarantor_s_employment_status_on_the_agreement_execution_dat DATE,
    detail_of_guarantor_s_employment TEXT,
    detail_of_guarantor_s_not_employed_status TEXT,
    did_the_creditworthiness_assessment_of_the_guarantor_for_the BOOLEAN,
    income_and_expenditure_information_held_in_relation_to_the_c TEXT,
    number_of_financial_dependants_for_the_guarantor INTEGER,
    net_or_gross_income_values_for_guarantor TEXT,
    monthly_income_of_the_guarantor_used_by_the_reporting_firm DECIMAL(18,2),
    total_monthly_expenditure_of_the_guarantor_used_by_the_repor DECIMAL(18,2),
    monthly_income_declared_by_the_guarantor DECIMAL(18,2),
    total_monthly_expenditure_declared_by_the_guarantor DECIMAL(18,2),
    specific_type_of_monthly_expenditure_of_the_guarantor_used_b TEXT,
    specific_total_monthly_expenditure_of_the_guarantor_used_by DECIMAL(18,2),
    agreement_characteristics_id TEXT NOT NULL,
    PRIMARY KEY (agreement_characteristics_id)
);

CREATE TABLE IF NOT EXISTS dim_borrower (
    is_the_borrower_a_natural_person_acting_as_a_sole_trader_or TEXT,
    reporting_firm_s_unique_reference_for_relevant_recipient_of TEXT,
    name_of_relevant_recipient_of_credit TEXT,
    number_of_borrowers_named_in_the_agreement INTEGER,
    reporting_firm_s_unique_reference_for_natural_person_acting TEXT,
    borrower_s_date_of_birth DATE,
    borrower_s_residential_address_type TEXT,
    borrower_s_residential_postcode_on_the_agreement_execution_d DATE,
    borrower_s_residential_status_on_the_agreement_execution_dat DATE,
    borrower_s_employment_status_on_the_agreement_execution_date DATE,
    detail_of_borrower_s_employment TEXT,
    detail_of_borrower_s_not_employed_status TEXT,
    borrower_id TEXT NOT NULL,
    PRIMARY KEY (borrower_id)
);

CREATE TABLE IF NOT EXISTS bridge_credit_agreement_borrowe (
    borrower_id TEXT NOT NULL,
    credit_agreement_sale_id TEXT NOT NULL,
    borrower_sequence_number INTEGER NOT NULL,
    PRIMARY KEY (borrower_sequence_number)
);

CREATE TABLE IF NOT EXISTS dim_creditworthiness_assess (
    did_the_creditworthiness_assessment_of_the_borrower_s_for_th BOOLEAN,
    income_and_expenditure_information_held_in_relation_to_the_c TEXT,
    is_a_future_lump_sum_expected_to_account_for_whole_or_partia DECIMAL(18,2),
    is_repayment_through_a_future_earnings_agreement_income_shar DECIMAL(18,2),
    combined_number_of_financial_dependants_for_the_borrower_s INTEGER,
    net_or_gross_income_values_for_borrower_s TEXT,
    combined_monthly_income_of_the_borrower_s_used_by_the_report DECIMAL(18,2),
    combined_total_monthly_expenditure_of_the_borrower_s_used_by DECIMAL(18,2),
    combined_monthly_income_declared_by_the_borrower_s DECIMAL(18,2),
    combined_total_monthly_expenditure_declared_by_the_borrower DECIMAL(18,2),
    specific_type_of_combined_monthly_expenditure_of_the_borrowe TEXT,
    specific_combined_total_monthly_expenditure_of_the_borrower DECIMAL(18,2),
    creditworthiness_assessment_id TEXT NOT NULL,
    PRIMARY KEY (creditworthiness_assessment_id)
);

CREATE TABLE IF NOT EXISTS dim_security_details (
    type_of_security_provided_by_borrower_s_in_relation_to_agree TEXT,
    estimated_value_of_security_provided_by_borrower_s_in_relati DECIMAL(18,2),
    what_type_of_future_lump_sum_is_the_security TEXT,
    is_the_person_who_has_provided_the_guarantee_or_the_indemnit BOOLEAN,
    security_id TEXT NOT NULL,
    PRIMARY KEY (security_id)
);

CREATE TABLE IF NOT EXISTS dim_total_amount_credit (
    the_value_of_the_total_amount_of_credit_which_is_not_advance DECIMAL(18,2),
    total_cash_price_of_all_goods_and_services_financed_by_the_a DECIMAL(18,2),
    advance_payment DECIMAL(18,2),
    total_amount_of_credit DECIMAL(18,2),
    total_amount_of_credit_id TEXT NOT NULL,
    PRIMARY KEY (total_amount_of_credit_id)
);

CREATE TABLE IF NOT EXISTS dim_total_charge_credit (
    apr DECIMAL(7,4),
    is_the_annual_interest_rate_fixed_or_variable TEXT,
    does_the_rate_of_interest_reduce_over_time_in_response_to_in BOOLEAN,
    annual_interest_rate DECIMAL(7,4),
    total_charge_for_credit DECIMAL(18,2),
    total_charge_for_credit_total_fees_or_charges_payable_by_the DECIMAL(18,2),
    total_charge_for_credit_total_one_off_costs_payable_to_the_r DECIMAL(18,2),
    total_charge_for_credit_total_periodic_fees_or_charges_payab DECIMAL(18,2),
    total_periodic_fees_or_charges_payable_in_an_annual_period DECIMAL(18,2),
    is_there_an_initial_promotional_period_during_which_regular DECIMAL(18,2),
    total_charge_for_credit_total_interest_payable DECIMAL(18,2),
    total_charge_for_credit_total_other_costs_included_in_the_to DECIMAL(18,2),
    total_charge_for_credit_id TEXT NOT NULL,
    PRIMARY KEY (total_charge_for_credit_id)
);

CREATE TABLE IF NOT EXISTS dim_running_account_use (
    can_qualifying_drawdowns_for_purchases_be_repaid_with_an_ins TEXT,
    does_the_product_include_any_rewards_for_making_qualifying_d BOOLEAN,
    type_of_rewards_for_borrower_s_to_make_drawdowns TEXT,
    regular_non_promotional_percentage_fee_for_non_sterling_draw DECIMAL(7,4),
    regular_non_promotional_minimum_fee_for_non_sterling_drawdow DECIMAL(18,2),
    drawdown_type TEXT,
    is_there_an_initial_promotional_period_for_drawdowns BOOLEAN,
    promotional_annual_interest_rate_for_drawdowns DECIMAL(7,4),
    promotional_percentage_fee_for_drawdowns DECIMAL(7,4),
    promotional_minimum_fee_per_drawdown DECIMAL(18,2),
    promotional_fixed_fee_per_drawdown DECIMAL(18,2),
    promotional_end_date_for_qualifying_drawdowns DATE,
    promotional_end_date_for_promotional_rate_for_drawdowns DATE,
    regular_non_promotional_annual_interest_rate_for_drawdowns DECIMAL(7,4),
    regular_non_promotional_percentage_fee_for_drawdowns DECIMAL(7,4),
    regular_non_promotional_minimum_fee_per_drawdown DECIMAL(18,2),
    regular_non_promotional_fixed_fee_per_drawdown DECIMAL(18,2),
    annual_interest_rate_for_periodic_premium_or_fee DECIMAL(7,4),
    running_account_usage_id TEXT NOT NULL,
    PRIMARY KEY (running_account_usage_id)
);

CREATE TABLE IF NOT EXISTS dim_penalty_charges (
    penalty_charge_for_a_late_repayment DECIMAL(18,2),
    penalty_charge_for_a_repayment_returned_unpaid DECIMAL(18,2),
    penalty_charge_for_agreement_balance_being_over_the_agreed_c DECIMAL(18,2),
    penalty_charges_id TEXT NOT NULL,
    PRIMARY KEY (penalty_charges_id)
);

CREATE TABLE IF NOT EXISTS dim_repayment_terms (
    repayment_method_arranged DECIMAL(18,2),
    frequency_of_regular_repayments_or_statements DECIMAL(18,2),
    number_of_repayments_scheduled DECIMAL(18,2),
    amount_of_regular_repayment DECIMAL(18,2),
    repayment_terms_id TEXT NOT NULL,
    PRIMARY KEY (repayment_terms_id)
);

CREATE TABLE IF NOT EXISTS regulatory_field_extension (
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    regulatory_report_code TEXT NOT NULL,
    regulatory_field_code TEXT NOT NULL,
    regulatory_field_name TEXT NOT NULL,
    data_type TEXT NOT NULL,
    value_string TEXT,
    value_number DECIMAL(18,2),
    value_date DATE,
    value_bool BOOLEAN,
    effective_from DATE NOT NULL,
    source_system TEXT
);
