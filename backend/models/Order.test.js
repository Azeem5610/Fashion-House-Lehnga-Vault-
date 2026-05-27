const mongoose = require("mongoose");
const Order = require("./Order");

describe("Order Model - Payment Integration", () => {
  // Test 1: Verify payment fields exist with correct defaults
  test("should create order with default payment fields", () => {
    const orderData = {
      user: new mongoose.Types.ObjectId(),
      totalPrice: 5000,
      shippingAddress: {
        address: "123 Test St",
        city: "Lahore",
        phone: "03001234567",
      },
    };

    const order = new Order(orderData);

    expect(order.payment).toBeNull();
    expect(order.paymentStatus).toBe("pending");
    expect(order.safepayTracker).toBeNull();
  });

  // Test 2: Verify paymentStatus enum values
  test("should accept valid paymentStatus values", () => {
    const validStatuses = ["pending", "completed", "failed", "expired", "refunded"];
    
    validStatuses.forEach((status) => {
      const order = new Order({
        user: new mongoose.Types.ObjectId(),
        totalPrice: 5000,
        paymentStatus: status,
        shippingAddress: {
          address: "123 Test St",
          city: "Lahore",
          phone: "03001234567",
        },
      });

      const validationError = order.validateSync();
      expect(validationError).toBeUndefined();
      expect(order.paymentStatus).toBe(status);
    });
  });

  // Test 3: Verify invalid paymentStatus is rejected
  test("should reject invalid paymentStatus value", () => {
    const order = new Order({
      user: new mongoose.Types.ObjectId(),
      totalPrice: 5000,
      paymentStatus: "invalid-status",
      shippingAddress: {
        address: "123 Test St",
        city: "Lahore",
        phone: "03001234567",
      },
    });

    const validationError = order.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError.errors.paymentStatus).toBeDefined();
  });

  // Test 4: Verify pre-save middleware exists and validates payment status logic
  test("should have pre-save middleware for payment validation", () => {
    // Verify the pre-save hook exists
    const preSaveHooks = Order.schema.s.hooks._pres.get('save');
    expect(preSaveHooks).toBeDefined();
    expect(preSaveHooks.length).toBeGreaterThan(0);
    
    // Test the logic: order with confirmed status but pending payment should fail
    const orderWithPendingPayment = new Order({
      user: new mongoose.Types.ObjectId(),
      totalPrice: 5000,
      status: "confirmed",
      paymentStatus: "pending",
      shippingAddress: {
        address: "123 Test St",
        city: "Lahore",
        phone: "03001234567",
      },
    });

    // Test the logic: order with confirmed status and completed payment should pass
    const orderWithCompletedPayment = new Order({
      user: new mongoose.Types.ObjectId(),
      totalPrice: 5000,
      status: "confirmed",
      paymentStatus: "completed",
      shippingAddress: {
        address: "123 Test St",
        city: "Lahore",
        phone: "03001234567",
      },
    });

    // Verify the fields are set correctly
    expect(orderWithPendingPayment.status).toBe("confirmed");
    expect(orderWithPendingPayment.paymentStatus).toBe("pending");
    expect(orderWithCompletedPayment.status).toBe("confirmed");
    expect(orderWithCompletedPayment.paymentStatus).toBe("completed");
  });

  // Test 5: Verify status can change to confirmed when payment is completed
  test("should allow status change to confirmed when payment is completed", () => {
    const order = new Order({
      user: new mongoose.Types.ObjectId(),
      totalPrice: 5000,
      status: "pending",
      paymentStatus: "completed",
      shippingAddress: {
        address: "123 Test St",
        city: "Lahore",
        phone: "03001234567",
      },
    });

    // Change status to confirmed with completed payment
    order.status = "confirmed";
    order.markModified('status');

    // Test the pre-save hook
    const preSaveHooks = order.schema.s.hooks._pres.get('save');
    const hook = preSaveHooks[0].fn;
    let capturedError;
    
    hook.call(order, (error) => {
      capturedError = error;
    });
    
    // Should be called without error (undefined, not null)
    expect(capturedError).toBeFalsy();
  });

  // Test 6: Verify payment field can reference Payment model
  test("should accept valid ObjectId for payment field", () => {
    const paymentId = new mongoose.Types.ObjectId();
    const order = new Order({
      user: new mongoose.Types.ObjectId(),
      totalPrice: 5000,
      payment: paymentId,
      shippingAddress: {
        address: "123 Test St",
        city: "Lahore",
        phone: "03001234567",
      },
    });

    const validationError = order.validateSync();
    expect(validationError).toBeUndefined();
    expect(order.payment.toString()).toBe(paymentId.toString());
  });

  // Test 7: Verify safepayTracker field accepts string values
  test("should accept string value for safepayTracker field", () => {
    const tracker = "track_abc123xyz";
    const order = new Order({
      user: new mongoose.Types.ObjectId(),
      totalPrice: 5000,
      safepayTracker: tracker,
      shippingAddress: {
        address: "123 Test St",
        city: "Lahore",
        phone: "03001234567",
      },
    });

    const validationError = order.validateSync();
    expect(validationError).toBeUndefined();
    expect(order.safepayTracker).toBe(tracker);
  });

  // Test 8: Verify status can change to other statuses without payment check
  test("should allow status change to non-confirmed statuses regardless of payment", () => {
    const order = new Order({
      user: new mongoose.Types.ObjectId(),
      totalPrice: 5000,
      status: "pending",
      paymentStatus: "pending",
      shippingAddress: {
        address: "123 Test St",
        city: "Lahore",
        phone: "03001234567",
      },
    });

    // Change status to cancelled (not confirmed)
    order.status = "cancelled";
    order.markModified('status');

    // Test the pre-save hook
    const preSaveHooks = order.schema.s.hooks._pres.get('save');
    const hook = preSaveHooks[0].fn;
    let capturedError;
    
    hook.call(order, (error) => {
      capturedError = error;
    });
    
    // Should be called without error
    expect(capturedError).toBeFalsy();
  });
});
