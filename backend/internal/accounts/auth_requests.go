package accounts

// Request bodies — the JSON contract of accounts/serializers/auth.py.
// Choice fields use omitempty; handlers apply Django's defaults via defStr.

type loginReq struct {
	Identifier string `json:"identifier" validate:"required"`
	Password   string `json:"password" validate:"required"`
}

type beginReq struct {
	Phone   string `json:"phone" validate:"required"`
	Channel string `json:"channel" validate:"omitempty,oneof=WEB APP USSD HUB"`
}

type otpRequestReq struct {
	Phone    string `json:"phone" validate:"required"`
	Purpose  string `json:"purpose" validate:"omitempty,oneof=LOGIN REGISTER PHONE_CHANGE PIN_RESET AGENT_ACTION"`
	Channel  string `json:"channel" validate:"omitempty,oneof=WEB APP USSD HUB"`
	DeviceID string `json:"device_id"`
	ForceOTP bool   `json:"force_otp"`
}

type otpVerifyReq struct {
	Phone    string `json:"phone" validate:"required"`
	Code     string `json:"code" validate:"required"`
	Purpose  string `json:"purpose" validate:"omitempty,oneof=LOGIN REGISTER PHONE_CHANGE PIN_RESET AGENT_ACTION"`
	Channel  string `json:"channel" validate:"omitempty,oneof=WEB APP USSD HUB"`
	DeviceID string `json:"device_id"`
}

type pinLoginReq struct {
	Phone   string `json:"phone" validate:"required"`
	Pin     string `json:"pin" validate:"required,min=4,max=4"`
	Channel string `json:"channel" validate:"omitempty,oneof=WEB APP USSD HUB"`
}

type pinSetReq struct {
	Pin        string  `json:"pin" validate:"required,min=4,max=4"`
	PinConfirm *string `json:"pin_confirm" validate:"omitempty,min=4,max=4"`
}

type pinVerifyReq struct {
	Pin string `json:"pin" validate:"required,min=4,max=4"`
}

type refreshReq struct {
	Refresh string `json:"refresh" validate:"required"`
}

func defStr(v, d string) string {
	if v == "" {
		return d
	}
	return v
}
