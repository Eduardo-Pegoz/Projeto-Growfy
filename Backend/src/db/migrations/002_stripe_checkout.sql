ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_checkout_session_unique_idx
    ON payments(stripe_checkout_session_id)
    WHERE stripe_checkout_session_id IS NOT NULL;

ALTER TABLE orders
    DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded'));

ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments
    ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'partially_refunded', 'refunded'));

CREATE UNIQUE INDEX IF NOT EXISTS orders_one_pending_course_per_user_idx
    ON orders(user_id, course_id)
    WHERE status = 'pending';
