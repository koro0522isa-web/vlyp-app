const Stripe = require('stripe');

const stripe = new Stripe('sk_test_51TRdHsIntgkn2Dgc5mK3Dx1wdVP1bohnzZoCKljFvvvfID6eqrjfuwB96gWXnXofOd7H1LNyik9uOSydwCsa5eaN00AgWqjhIC', {
  apiVersion: '2025-01-27.acacia',
});

async function run() {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1TRzQWIntgkn2Dgc3Xv0rNc3',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `http://localhost:3000/post?success=true`,
      cancel_url: `http://localhost:3000/post?canceled=true`,
      metadata: {
        userId: 'test-user',
        packId: 'pro',
      },
    });
    console.log("Success! URL:", session.url);
  } catch (error) {
    console.error("Stripe Error:", error.message);
  }
}

run();
