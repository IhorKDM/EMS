from pydantic import BaseModel


class PermissionSchema(BaseModel):
    """Full permission flags — used for create, update, and responses."""
    can_add_user:         bool = False
    can_promote_user:     bool = False
    can_delete_user:      bool = False
    can_manage_positions: bool = False
    can_manage_sections:  bool = False
    can_accept_requests:  bool = False
    can_manage_schedule:  bool = False
    can_view_payroll:     bool = False
    can_manage_payroll:   bool = False
    can_see_logs:         bool = False

    model_config = {"from_attributes": True}