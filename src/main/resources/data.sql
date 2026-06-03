DELETE FROM workflow_history;
DELETE FROM contracts;

INSERT INTO contracts (
    id,
    title,
    description,
    status,
    owner_name,
    created_at,
    updated_at,
    contract_name,
    uploaded_at
) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'Master Services Agreement',
    'Annual consulting services agreement for enterprise operations.',
    'DRAFT',
    'Priya Sharma',
    TIMESTAMP '2026-06-01 09:30:00',
    TIMESTAMP '2026-06-01 09:30:00',
    'Master Services Agreement',
    TIMESTAMP '2026-06-01 09:30:00'
),
(
    '22222222-2222-2222-2222-222222222222',
    'Vendor NDA',
    'Confidentiality agreement for vendor onboarding.',
    'REVIEW',
    'Ravi Kumar',
    TIMESTAMP '2026-06-02 11:15:00',
    TIMESTAMP '2026-06-02 15:40:00',
    'Vendor NDA',
    TIMESTAMP '2026-06-02 11:15:00'
),
(
    '33333333-3333-3333-3333-333333333333',
    'Software License Agreement',
    'License terms for internal software procurement.',
    'APPROVED',
    'Meera Iyer',
    TIMESTAMP '2026-06-03 10:00:00',
    TIMESTAMP '2026-06-03 17:20:00',
    'Software License Agreement',
    TIMESTAMP '2026-06-03 10:00:00'
);

INSERT INTO workflow_history (
    id,
    contract_id,
    previous_status,
    new_status,
    changed_by,
    changed_at
) VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'DRAFT',
    'REVIEW',
    'system',
    TIMESTAMP '2026-06-02 15:40:00'
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '33333333-3333-3333-3333-333333333333',
    'DRAFT',
    'REVIEW',
    'system',
    TIMESTAMP '2026-06-03 12:00:00'
),
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    'REVIEW',
    'APPROVED',
    'system',
    TIMESTAMP '2026-06-03 17:20:00'
);
