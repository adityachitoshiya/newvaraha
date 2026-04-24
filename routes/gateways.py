from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict, Any
import json
from pydantic import BaseModel

# Internal Imports
from database import get_session
from models import PaymentGateway
from dependencies import oauth2_scheme

router = APIRouter()

# Request Models
class GatewayCreate(BaseModel):
    name: str
    provider: str
    credentials: Dict[str, Any]
    is_active: bool = False

class GatewayUpdate(BaseModel):
    is_active: bool
    credentials: Dict[str, Any]

@router.post("/api/gateways", response_model=PaymentGateway)
def create_gateway(gateway_in: GatewayCreate, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    # Deactivate others if this one is active
    if gateway_in.is_active:
        statement = select(PaymentGateway).where(PaymentGateway.is_active == True)
        active_gateways = session.exec(statement).all()
        for g in active_gateways:
            g.is_active = False
            session.add(g)
    
    # Create DB model
    gateway = PaymentGateway(
        name=gateway_in.name,
        provider=gateway_in.provider,
        is_active=gateway_in.is_active,
        credentials_json=json.dumps(gateway_in.credentials)
    )
    
    session.add(gateway)
    session.commit()
    session.refresh(gateway)
    return gateway

@router.get("/api/gateways")
def read_gateways(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    gateways = session.exec(select(PaymentGateway)).all()
    results = []
    for g in gateways:
        g_dict = g.model_dump()
        try:
            creds = json.loads(g.credentials_json)
            # Mask sensitive fields
            if 'key_secret' in creds:
                creds['key_secret'] = '********'
            g_dict['credentials_json'] = json.dumps(creds)
        except:
            pass
        results.append(g_dict)
    return results

@router.put("/api/gateways/{gateway_id}", response_model=PaymentGateway)
def update_gateway(gateway_id: int, gateway_in: GatewayUpdate, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    gateway = session.get(PaymentGateway, gateway_id)
    if not gateway:
        raise HTTPException(status_code=404, detail="Gateway not found")
    
    # Logic to only have one active gateway
    if gateway_in.is_active and not gateway.is_active:
        active_gateways = session.exec(select(PaymentGateway).where(PaymentGateway.is_active == True)).all()
        for g in active_gateways:
            g.is_active = False
            session.add(g)
            
    gateway.is_active = gateway_in.is_active
    
    # Only update credentials if they don't contain masked values
    # This prevents credential corruption when just toggling active status
    incoming_creds = gateway_in.credentials
    existing_creds = json.loads(gateway.credentials_json) if gateway.credentials_json else {}
    
    has_masked_values = any(
        isinstance(v, str) and '********' in v 
        for v in incoming_creds.values()
    )
    
    if not has_masked_values:
        # All credentials are real, update them
        gateway.credentials_json = json.dumps(incoming_creds)
    else:
        # Some credentials are masked - merge: keep existing for masked, update non-masked
        merged_creds = existing_creds.copy()
        for key, value in incoming_creds.items():
            if isinstance(value, str) and '********' in value:
                # Keep existing credential for masked values
                pass
            else:
                # Update with new value
                merged_creds[key] = value
        gateway.credentials_json = json.dumps(merged_creds)
    
    session.add(gateway)
    session.commit()
    session.refresh(gateway)
    return gateway

@router.delete("/api/gateways/{gateway_id}")
def delete_gateway(gateway_id: int, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    gateway = session.get(PaymentGateway, gateway_id)
    if not gateway:
        raise HTTPException(status_code=404, detail="Gateway not found")
    session.delete(gateway)
    session.commit()
    return {"ok": True}
