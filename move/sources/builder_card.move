module builder_card::builder_card;

use std::string::{Self, String};
use std::vector;

use sui::display;
use sui::object::{Self, UID};
use sui::package;
use sui::transfer;
use sui::tx_context::{Self, TxContext};

use builder_registry::builder_registry::{
    BuilderRegistry,
    claim_builder_number,
};

/// One-Time Witness used when the package is first published.
public struct BUILDER_CARD has drop {}

/// A self-created on-chain portfolio produced by a participant
/// during the Cryptita Builder Workshop.
public struct BuilderCard has key, store {
    id: UID,

    builder_name: String,

    /// Chronological workshop-wide builder number assigned
    /// automatically by the Cryptita Builder Registry.
    builder_no: u64,

    profession: String,
    program: String,
    country: String,
    specialization: String,
    building_since: String,
    focus: String,
    community: String,
    skills: String,
    issued: String,
    about: String,
    /// Deployed workshop site URL (shown on Suiscan as link).
    website_url: String,
    /// Derived at create time: `{website_url}/assets/profile.png` for explorers.
    photo_url: String,
}

/// Runs once when each participant publishes their BuilderCard package.
///
/// Creates Display metadata so explorers and other Sui applications
/// can present BuilderCard as a portfolio instead of only a raw Move object.
fun init(
    otw: BUILDER_CARD,
    ctx: &mut TxContext,
) {
    let publisher = package::claim(otw, ctx);

    let keys = vector[
        string::utf8(b"name"),
        string::utf8(b"description"),
        string::utf8(b"creator"),
        string::utf8(b"image_url"),
        string::utf8(b"builder_no"),
        string::utf8(b"profession"),
        string::utf8(b"program"),
        string::utf8(b"country"),
        string::utf8(b"specialization"),
        string::utf8(b"building_since"),
        string::utf8(b"focus"),
        string::utf8(b"community"),
        string::utf8(b"skills"),
        string::utf8(b"issued"),
        string::utf8(b"link"),
    ];

    let values = vector[
        string::utf8(b"Cryptita Builder #{builder_no} — {builder_name}"),

        string::utf8(
            b"Self-created Proof of Learning & Building portfolio produced during the Cryptita Builder Workshop. This on-chain BuilderCard records the participant's workshop portfolio and builder number."
        ),

        string::utf8(b"{builder_name}"),

        string::utf8(b"{photo_url}"),

        string::utf8(b"{builder_no}"),

        string::utf8(b"{profession}"),

        string::utf8(b"{program}"),

        string::utf8(b"{country}"),

        string::utf8(b"{specialization}"),

        string::utf8(b"{building_since}"),

        string::utf8(b"{focus}"),

        string::utf8(b"{community}"),

        string::utf8(b"{skills}"),

        string::utf8(b"{issued}"),

        string::utf8(b"{website_url}"),
    ];

    let mut display = display::new_with_fields<BuilderCard>(
        &publisher,
        keys,
        values,
        ctx,
    );

    display::update_version(&mut display);

    transfer::public_transfer(
        publisher,
        tx_context::sender(ctx),
    );

    transfer::public_transfer(
        display,
        tx_context::sender(ctx),
    );
}

/// Builds the public profile image URL from the deployed site root.
fun profile_photo_url(website_url: &String): String {
    let mut photo_url = string::utf8(b"");
    string::append_utf8(&mut photo_url, *string::as_bytes(website_url));
    string::append(&mut photo_url, string::utf8(b"/assets/profile.png"));
    photo_url
}

#[test]
fun test_profile_photo_url() {
    let url = string::utf8(b"https://example.com");
    assert!(
        profile_photo_url(&url) == string::utf8(b"https://example.com/assets/profile.png"),
        0,
    );
}

/// Creates the participant's BuilderCard.
///
/// Builder number is automatically claimed from the shared
/// Cryptita Builder Registry.
#[allow(lint(self_transfer))]
public fun create_builder_card(
    registry: &mut BuilderRegistry,
    builder_name: String,
    profession: String,
    program: String,
    country: String,
    specialization: String,
    building_since: String,
    focus: String,
    community: String,
    skills: String,
    issued: String,
    about: String,
    website_url: String,
    ctx: &mut TxContext,
) {
    let builder_no = claim_builder_number(registry);
    let photo_url = profile_photo_url(&website_url);

    let card = BuilderCard {
        id: object::new(ctx),
        builder_name,
        builder_no,
        profession,
        program,
        country,
        specialization,
        building_since,
        focus,
        community,
        skills,
        issued,
        about,
        website_url,
        photo_url,
    };

    transfer::transfer(
        card,
        tx_context::sender(ctx),
    );
}
