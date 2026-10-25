//! Polyglot contract code preview generator.

use dado_core::polyglot::{generate_rust_struct, generate_ts_interface, generate_zod_schema};

use crate::error::Result;
use crate::model::{ContractPreviewRequest, ContractPreviewResponse};

/// Generates polyglot code previews from a `SharedTypeContract`.
pub fn preview_contract(req: &ContractPreviewRequest) -> Result<ContractPreviewResponse> {
    let rust_code = generate_rust_struct(&req.contract);
    let typescript_code = generate_ts_interface(&req.contract);
    let zod_code = generate_zod_schema(&req.contract);

    Ok(ContractPreviewResponse {
        rust_code,
        typescript_code,
        zod_code,
    })
}

