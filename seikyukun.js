
var STAMP_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iODQiIHpvb21BbmRQYW49Im1hZ25pZnkiIHZpZXdCb3g9IjAgMCA2MyA2NS4yNDk5OTkiIGhlaWdodD0iODciIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIG1lZXQiIHZlcnNpb249IjEuMCI+PGRlZnM+PGZpbHRlciB4PSIwJSIgeT0iMCUiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGlkPSIwZjkxMGUwNjgyIj48ZmVDb2xvck1hdHJpeCB2YWx1ZXM9IjAgMCAwIDAgMSAwIDAgMCAwIDEgMCAwIDAgMCAxIDAgMCAwIDEgMCIgY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzPSJzUkdCIi8+PC9maWx0ZXI+PGZpbHRlciB4PSIwJSIgeT0iMCUiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGlkPSI0NzhlN2QzNjQ4Ij48ZmVDb2xvck1hdHJpeCB2YWx1ZXM9IjAgMCAwIDAgMSAwIDAgMCAwIDEgMCAwIDAgMCAxIDAuMjEyNiAwLjcxNTIgMC4wNzIyIDAgMCIgY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzPSJzUkdCIi8+PC9maWx0ZXI+PGNsaXBQYXRoIGlkPSI0OTdjODI5NzVhIj48cGF0aCBkPSJNIDAuMzU5Mzc1IDAgTCA2Mi42NDA2MjUgMCBMIDYyLjY0MDYyNSA2NC41MDc4MTIgTCAwLjM1OTM3NSA2NC41MDc4MTIgWiBNIDAuMzU5Mzc1IDAgIiBjbGlwLXJ1bGU9Im5vbnplcm8iLz48L2NsaXBQYXRoPjxtYXNrIGlkPSI2NWU3ZmRmMzg1Ij48ZyBmaWx0ZXI9InVybCgjMGY5MTBlMDY4MikiPjxnIGZpbHRlcj0idXJsKCM0NzhlN2QzNjQ4KSIgdHJhbnNmb3JtPSJtYXRyaXgoMC43NDE0NzcsIDAsIDAsIDAuNzQxNDc3LCAwLjM1Nzk1NSwgMC4wMDAwMDA5ODg2MzYpIj48aW1hZ2UgeD0iMCIgeT0iMCIgd2lkdGg9Ijg0IiB4bGluazpocmVmPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUZRQUFBQlhDQUFBQUFDL2xEMnpBQUFBQW1KTFIwUUEvNGVQekw4QUFBZmlTVVJCVkZpRjdaaHJWRlRYRmNkL0F3T2lnaGprSlNwYXhTQ0dxRkZqVVpJRkM5T2d1S0lRV0dKQURiNld1cUxpdTFFVE1ZbFZVWXlQVUt3YXFtQVVFclQ0d2hwcW0xR0pWWHdCR2xsQkVEUXFMOFVnSWdvemMvcmh6cE9aUWNGODZHcmRYMmJ2L3o3M2QvZWRlKzY1NTI1NGFTL3QvOVJrelFXM1FkMTZ0QTZoTGluT2Eyd2hMNStoVUlrMldPWGFiaFlyRGZuU200WXpOMisxcmxJcnJ3RysxQzM5aTltazdBc2hDcU02dG80bzJadjdoVGhpN2tqWlh0RzRRTjRXSkVCWWxjaDFOcFZYaTVxZ3RpSUJyK3RDWVZKU2lMb3hDS0s5QWR5Q2JZeE9GMmx0RUUxZVlLZnpwMHl4QWw3dkErQitTMnhzeHBRWGlvVkE0YitnUFFGaXNtR3VLbTN4Y0YzZ1dDVlc2b0swOC9aQTBpTi9nS0ZQbTM0bnlWYmFjL1lyM0Fxd0Q5YmtEVmFuR2tKVkdUZHpRdXcxUVZ6N2ZSMzBxWE9OQUlkK0JMaXdSNzdVR0JyTkYwb0F2T1UrVGFWZ3U4MVZkMlNUYlVaaTRQVUpBSXlNblQ5ejBsUkpIeERvMmkxdHJ2NE1DWVFielZBMzVXTjdDUHZ3YmtyRm9kdTE1YUswWEp6QjBXaUMxM1VFdXQ1Smc2Q21PQ3VBK0I5K09DdWFlcEcwVjBNcEU3NkcwRkVpRzFpN3EvYkhYVWNiUTJKVmdZR0IzcnJrNVZpdDUxU2dhQWZNVnAvcEp3bWYxUTZDcEwzZ0RwQXVQakNFVGhjN0FlUU4wMW04bndDVllZN2o2eldPZSs3SnpvRGRycFhLeHAwOWdWNlBaL2tGQmg0OEVSaGVOd1BZS3VZQW9KbGE3bFFBK05yNXA0K2VCOERVd2ZQVUFId3FLanlsUVc4Y1B1YnhBSUQ5bzFOQ01tL0N4b3ZiMDExNTFUcU9DeU4yd2dOZU1ZUmFvd1FZVFdDK3cxVkFBQ2N6aEpROE5FajZEWW84bzZ0K2dOdFBNUFg5YTZHUmtPUVlMWWxxelgyM3d0QWlXRnQ3Uk5hcGlqL0paTElNWkRLWkNKREpOdlNVU3Qyb1p4SjhEZncyRmFuVE4yTnFSay9XSU85eTlmVGVMSEZpZG55ZFhyNVlIN1VPSUhTY1RuSU5HUmJiTlMxbS9QM2tWZk5Ob1VhVnhtNnA1ZEorMzZVSjZwL1dHY2hQMG1mS29ZOVZtVUtoVUFUM1ZDZ1VpdTlpanRGOVlpWnNHV09tVW8zRmlUaHdLK3BZT0owT2Vkc0RWT0hxTUNtaERnbE4vbjZJV0FaWkhnQXVxcmNKR3FrOUxDMFIwTS9UT0JGblVtbkRoSHFRcFRUTWd3TW4wOFpDLzRtSnNxejR3b2tYVTFZT3R2V3ZBZ2pPTzgzVnpkL1owNUlaUWg5ZUFxdWR2Y2M4QlNZOVBQaUpiZWFlYVhzRHZST3FXWGcvTzc1R0NUQnEvOEJBdjlTd1U4MnBrZW1tUzdHMjhNS2l6RTRRb0lLaGVXNEVaenRwOHI1M1JiVWpLNFFRUXRSY09wQ2tXcWU1L0l6UzB0S0hqMHBMbjRpNWVrcHovczROZ0xvUkxneFY4djNweHhyNTZ1Qmx2bzYxZXo1ZFVWSldXZ3U0K0dzU2MzV0w2MTA5cEJrMGVUZkFsVDhBU3VDeExsRVJDOXdLKzdzbVhESVFnSnpjQ3BPTE5vVW1BUEJyanJtaGdKWkpXUmtBZnpZL3pNcTgvR0wyRXRxQzlaamwxVUkyd3RKejN5SlVudTJYM2NGeXVtZm1OMjJBZXBiSFhPcFAzTkZnOCttTk55eHN2RnFFVm5xTkgzS0x6UzRaRnJaWVNrV3JvT01XeVBHenJ2OG82dU1xYW45T1Zab2ZKUnBhQmMxTDJNQ29LMjhlQ2YwVzlFOXJlQWd3OEIyZ2UzOEE4YVJWMEw1V3I3SXE4WFMwa1JpKzVpenR1YjgxVlViWHMvTUI4VjVJdTFaQTQvTEdRVkpjNnZzRzJnZGZSOVNRc2JuOHZhZ3dTdHZGQURMNTlwc2ZQVGMwZXZoc0pSQi9NRm0vbDErK0kvUUtSSS9kVkhMQW1XalZLRUNXN3YyM3hHM215MEsvdkVybVhybEtjanpxTW9EVTlXQy9weTRBZ0RuRmdDeC9DOERWU1BoSytKbFF6RTBXK2JjWFA1ZTh1Nm1UNVVxQVlYdHQvUXNBU0M0QXBubVAwUjY4eUtYMmVTN2Y2cS95Q0xYRzMxUnJCN2duLzd0aW1NU2s0UlI0YkZoOUc4QUdhSnhRYUZxVktYUlI1M2QxSzM1eGQyRHdhOHJQVnh2czJlelRjOWNBWVBiV202OTBkMWk5c2JEKzBkdWZHVEFkam5lWktGMkp3L05EcTFYTmhOU2hadzJpSWFjYlJsUkxGWGQ2ZnFpcC9heDM3VGFkeUJ5dHVUWDF4YWIzQ0RCLzkxc3liM1hmZTFwZkRIcHNmbEJyb2ZtTERJSjZDNFArVjk1UnZ6RzB6Wi9UTFVHbjNaajAvQkRINDFkKzN6SjA4blluMlBKcjZ1NlczczdHRmxPMFlrM0wwRU1Udm9IVXIrM1dTUzhnMnhuRG5zWHM0bFJ3cnJPaFlQcmZPVHRrOWZOY21CVGpMb1hxWVRzV2JqTExDaitvb29lYnE3dlh6SnlweGgwVVUrZ1VXZUtkZHM1MjBvSTUvL0kvRjArL2FiN0FkN1lKVnlndXVXRTdkbnhSdnBrQitwWGYrY0U4U0twMkEwQzJSaXl6RVQ3bW9jNEZHOGY2eU1GYi9OSEdtR0pTNmRySzdkaU8zMWNKZ01oRnN6YmpPZUJveW9kR0krOE5rSDRqSHlVMkdUT2FRNk9pUmp4bGxOTU9UVGk4TEV1cXd1SHd4M2g5bVE5NDJJTEhXeldqSDJrSk05S2Jyd0VhcUVyampQeHFYRDZ5RlZsWE5lbTNzNlhmam9kUEhXZHJPbkJQZ3ZVSlQ5R1c0WkdnaFZtamZRMEJ1dTk5bnlJL1lFclQ2eHE1cHlvQUcrR0RTODRKT1REYngzUkhabGU2UytjbmlWbUdLYWt6Z1lNTDRGU2htMEtmWEFZYjRUUGlWbzdGVDd5RUdqZWRueW5DREZOU0R3V0FkaWNMdE45RzlsVVJZQ09PcW81WlpJWXE5Wi9Xc2twaC9CUXF0TzBQV1ZwNUw2MjRLZ3VJRUtwNGF5ell1L1ZMOU1FUVVXS2NuU0d1eVFIc1V1NjhwdFhlK01VVDZGdzB4UkpTRmxzL3p5RGMzYnlGcHVtZ2RjODk1Nm5Uemt0TFQwZVR4cTNHM2pwN3hkOGc3TnY0dEhrN04wVGRHRVNuNHVVR0U3ZVBwUW8xdGp6Q2NKYmJuaGVtZTdYVm9pWUl4MmR3TEp2MUhuSGRkSFB4WXYzVExvZkZ3eUZtOUJmbzlMNHk1NTZvSHFvbkdlYmExcFBHcy9jSVcvNHh1OFJDdXEzZDg4YmpSby9TYjlEbjU1ZmJsKzQ5ZTlSTCsrK3ovd0IxUnpRRXUvMUpZQUFBQUFCSlJVNUVya0pnZ2c9PSIgaGVpZ2h0PSI4NyIgcHJlc2VydmVBc3BlY3RSYXRpbz0ieE1pZFlNaWQgbWVldCIvPjwvZz48L2c+PC9tYXNrPjwvZGVmcz48ZyBjbGlwLXBhdGg9InVybCgjNDk3YzgyOTc1YSkiPjxnIG1hc2s9InVybCgjNjVlN2ZkZjM4NSkiPjxnIHRyYW5zZm9ybT0ibWF0cml4KDAuNzQxNDc3LCAwLCAwLCAwLjc0MTQ3NywgMC4zNTc5NTUsIDAuMDAwMDAwOTg4NjM2KSI+PGltYWdlIHg9IjAiIHk9IjAiIHdpZHRoPSI4NCIgeGxpbms6aHJlZj0iZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFGUUFBQUJYQ0FJQUFBQVZuZlU0QUFBQUJtSkxSMFFBL3dEL0FQK2d2YWVUQUFBVUdrbEVRVlI0bk8xOFhYTWNSM2JsT1RlcnVodU5yd1lva2ZKTTJDdVByUEE2WXIzckI0Y2NzOTRIck5nQUNWQ2pDRC93Lzh6ZmNZd2ZISnFoSUlMVUJHM0hqTDlpdlBZKzdZUStyQTNGMkxKSWRqZEFOTkJkVlhtUEg3SWFCQm9Oa0FBMU5zZm1DUVNqQ1ZSbDVhbk12SG52eVhzYmVJVlhlSVZYZUlWWGVJWC9xT0NGcnQ2Ly9yN0RSVGtFNktLMy85SWdBU1R6UE1zeWF6WnovdUFIejNQYmMvVmVhMnNqeXlLdFlwWXBpNHh1RG45Sm1BTUFLSWtoMk5MUzNKTW5vNnB5ZDc3MjR4ODk0NlpuTnR0YnY1bTdMOFJpTjVzVEtZbDhtV2lmaEF2QlVGVkdPZzJyOXo0ODUrTHphQWdZZmVmdGNtVzFXbDJCYkVKWkRqT2x2Nzgwb0VqS2hkUkxTYVFnaHlMOWpaMmRtVGZaV2EwSktLKzkwZnI4azdoeWhUQVNGQ1NNR1FYWFM4VWNBaUFKZ0xtREFFbkF4RWpQWTloYis5N00yODRjK2NPM2ZxdjEyYWU3RzFzU0JKRG9GQWQ3b1ZHWW5mTXUvMzJ4ZS8ybVNJR2dTWjRtUVNoRFlOSFdtQThlVEYyZnpXeWx0MzZ6N1BmR0c1c1NKSm5CM1BmelJpWXhZT21qSFV3c2YxYU9MSmJOMFQ1LzlyTnp1alhZMkFTUTU1bVp0VnFOYzZ4eHY3c0pvdkRvMENpV3YzbXF4d0Q2M1MwQStXdXJvVDNYK28xdjgvdmY3M1czS0RsQUI0SUJNUVNQTVNNVjg3aFlqa2VXbjI1bnhyVFgybHJEdlZwWmRWR0FHU1JFV3NrUXMrQ09MNzk3Kzh2djNoNUZHS3hzTkp1ai9WRnIvaHptU0hzUlVKWlZxOVVZN284ZlgzOXY1bVc5Ymxkd0NJMlFqV0xabXRYajFCNkE4bEd2OVJ2ZkhuN3hCUUFTSWltSUVLS1pWNVZWVmIwNkIzbTdzakRZbUo3OE04aVBMSnVQaGNrSUVBanVKQ0NZczZvQUlXOFVBR2hlV3VuVVlPWHErY3dUM0FsaHQzOHdMbHdvSDczYi9YcHQ3ZFJWQVlnQ0lYVHllVHQ3V3lIbHhNTUhEN0txcXBrWVpaUUJ3UExkdXpFeUJKQ1FKQ0JhRHZtenlVZmFialluZ2xDblBNamNPenZiQkFFWUxVak5VTFFYOTQwT1VwSUZpOHZMQjF2djdhN2ZmTEt4TWJ1emdwa2tBMEZHTTdwWElXdjBObTRkWFRKWXZ3bUFhSkFrSVhodW9iK3hlYnlaM3ZXYnZldGJ5ZGlhNC9YWFh4OC83UFc3dDlMdVMzdHF3NjQrK0RBWUhHRDZtMkxvUFo2eTB0T3Zkdi82K3hVcnBmMENDTEZvd0VZaGgwUUFoQVZmSEkzNitaeEFvK1FJd1phVzJydURZV0FWQlZleXRsT3ZWUkJsaEl1RUJETTV6T1VWNHhzN093OXYzQWhPQTF3MHM2SVk1dmtjaUxDNGxDOHZwWVVOb05mZGhFUm1MaWNod2tUUlNSSk15Nkd6ODNSdmY3eCtTN1NnS0dIbC9vZUhiNzNkL3V5VE04a1BycitYd1FxV0pNcnkwQ3dQb1FFUUZGeXd5ZklGSU5Ja1VRNEx5ZmNSRU4yZGJNd2UvMmx3ekJMQUhCbkZTR1Z1QkNpUGdKbTVTS0h6djk3Wi8vbW40OGU3ciszOHNOZmRCR3VTRU5JakdSeHVSK1NMNHVuZ1A5cjRuaWtTU3A1QS90VS9MZjdmLzNNTytWc1JNZ01BOXhqak9NL25TY1VJSTBCM043UDBjQ2RNRWhIU3ZTR3IzT1dPMHlPZk5tR1NtcmdoQUNJa3lCMDVHWUs3QndDZFRDUEhvQ296aEVBRGFWU0Z6RHd5MlM5VC9lN0IraDhjYmUyU0lFY1ZFUUlDMWJtLzNWdmZoTkk2QW5EQzU1dmU2cHdLayt1TTRjcURCNE9OTFl0eE9ZNTM4elpnNlpLYWRmSXU0RXhUWTI0aGJ6WGJ2LzEybXFJSi9mWE5vNWVjSnMzS3NjZjN1NXNPVkJYSkFCZGljMCtGbVRLRS9UaGVDbTBqM1dXTUpPQUF0WHB2dTdleFNRTWlSRWd5QkFCaTVRb21HajNQU2JsUDVpZ3RiUVBUanRrMCtiU1E2cGdOQU5EWitYRC8rc1lnYndOd1I0d2poRFlZYThNS0FBSUZJdTRkTFA2UC96YjhmNS8yMTdlT2ozb2E4M3IwVDdtR1JsaU9PbVRJQ3dkY3pDeDByRjFmWUpRRGxJTGc3RzlzQ3ZCb0JxN2N1OU5mdnlsRUFCUU5ybnJrbEd4TC9kbzFvWGJ5NGFlc3ZZRHBIUUdGaFdRQ0NXVDVIQW56d0hxdUpXdWFqQTkyZi9LMzB6Y2ovVFV0T2dIc2RkK2IrcnVUQUlXWlRyUGtDRlZ3ODZ6ZkV5VUg2MzVyc1A1ZTJCL1d6NkJ4RW5KSkFDVk03SFp0d0tkM3p0a2UzbkgwMTdja1FRSnBnUzRRRkJWYm1SMVVScEJ5RUNSZGdzckh2YVBYQ05UbXFWSU1TRGJKVGd4K0doMTNLZkdmbmhuSjE2Z2ExZXJkdTN1Ly8wN2RwaWZySmlINnd1Smt3YWZIY1dWbktwTGpHWitmZzd5RTJsd0lnTXdNaW9KbGh6RzlVSGZHZG1hbHI5NjljL3pHM3RIa0o4b1k5MzNjeWRxQVorNWFXOXUxdWVaLytYYTE5NlI2c3FlenBRRUJab1F3V044S2V3TUZXV1V3STZMRTJzZ2x1M2R4bkJuVkpleGZmNStBTzQ1bWxNc2pEWUFrSTVMZHl3OHF1dnJyczUxV1NSbkRZbWlseldqUlI0Y2hCem4rLzc5WStOM2ZnV2poMkE5Qit2SGZKTC9CeExpNDNLZ0lFeFJUeTUzN2QxNGt2bnpHeUZjaDVqRWJXemxpMVZJR3dQYjNENjRzengxRXNiWmdCSnlnVTFKLy9aYW5WeldSdVNRbm1UTlQybkJNL2RCdUVrYnpxRWMvK2J1NStibHllSmlXUnhaVU9oQUNhcDlhUnhaYkRFazlPcjViUG5ubkQxdWZmVEo2NisxZkNua0E0MFlaUEhCaUJaZC8rdWRhdjBWREo4T2dBZ0JQUzFWT01tUVd4TEtNTUV2bUFUQW9XVXJGbVBacGxyVGx4Ym5CWVBoYXVYZXcxMXo1OFYwQWc0MnRzakxBNFFJWVVGVUtKTXZ5Z0F5VlJsY25FZDVndmZaNTQrTHkwdC84Qko5L09qanVKbTlzU3NnOW1qVG41ZURTNUdOd2lrNjMydHh6c0w0bHVRVi9FdmwwSDhuQUVvSmlqSjNsK2NGZ0NJZ0dpYUFuTDlRalNTZmxidkxZMjkybnVCY2FKdTkxdDVBV0Z5QWphWWlva05Qa1FwYTNxL0xBYkVaWEJmU3VieUh0YkVZQVNWbzFROEZzSlI3TWpHU2ZsL3lWN2UzMFlkRGRBaERsRkpValJoN1pHQUtJTUVLT0hObiszc2hFcDJoUmJoQkJkWGEyQWV6ZXVPRktib2dJaUlyd3lCejFPZ0VnQ2xCU2l1aENJTjA5eStmazhYVDNhRXdMUXdJOE9RTUE2QTRTZzJ5K25RblZtZXllWWZDbUVOSmlpMUNnUE1qTVNBZ21ackhxeEFOVG9VcGx3R0VybEF4bXZuTC93NVY3OVJ0Y3ZudFhNRVdWRlFESUNiUVNDNlZkcmw1QkJhQmtTbDFPR21IazAzRTZNbkZsS2VhZWZwQUpXZjJabVNONFo2WHQyWGxSeG9YSTA0b1F4Q3M3MjFlMnR5RnluTHVjUU9mZWgvTmVBSmp6MGRMSFB5b2FCcURJdy9MZHUxTk5yTzdjaVJGbWlCRVRyeThBRHF2cEN4RUlRSFhsL3ZicXZROUpJTVE2cGp3R0J3MmVoWmtUQWdEeUxCdU54NjI1RjVqMng1blRLUk5qL2I0WWc2eUNaN0lLd0hHRjdGcy8vT0U1RFYxOU1DMG45elpxLzM5bFozdjZhbE1Lb0k0ZkV3aWs1R1NRbHU5OWRINi9rK1kxbTlMc1N5ZFI0OHI5ODNUdlh3bWN3K2hpYS80L0dQNVRrMy8rTlg4QlBON1lnSXdVUWFOT203MUxZN0N4bVd5ZnhOWDdkNTU1L2ZuNDVrZGVhMnZOS05DaFlGVEo4RS9mbTMxZ2NwbkdrNjBUQWZXN3Q1NTl3N240NWtkK3hIdytsaFhib21JTXhWeG9GSjZzRGdHQ3l5ODJZaWxXcC9qaVIyYmYvTWlYaHQwdzczQUpOTFJIMFZJUVJoRE12TlFNdWY0Q2tJZ3pkSStMNGtWSHZ0L2RBcEY3RmRMcFFIdStyS3FSbDAzUENIaEVGaW80SFFYUmNIamJpMmMzZWpaVzdtMzN1bHM4RW5CZkRDODg3ZE01Vk1qbWk0TW5XYk1jRmFzckM5b2J1Z21RZ1ZFR1JpZ0FEdGtUYXk3NitIZ0RnKzVXR2taUnEvYys2dDk0RDU0Y2RIUSt2dk40Y3hQSmg0dTQ4dkUyNmxqS2FhWlRndVJGOFUxTWU0ZGN2Y1pjVWwxMkIvdXNQRG11Z2tCMjd0MnJUMDJJaXVHNEx6am9iZ2tUWGF6S3Z2enU3Ykl5R09rSWcwZUgzL210NWkvK0dRR0lJRkJiT0FxazNBTjBjT09tTmpmUDZOYXo4UTJRVHhwbVVBb3A0YlJJQXdrblBIU21QTlpqTG1WdmZjdVRWa3dFUy9JbThpQzNDUE5xZGFYMSthZmVtczhLR1VIYVJIeE4wcWxWMEp4eEdJL3BaUmZFQzVIdmJXeUtrRUhTY2puTXZUNkxNaElPd2x4NjlPNFpCN0sxbnA4VUlMZ2JvSVdGSVJSWEZ4WVFJWEhRdlFVTGpIbXRsdFRUWEZDU3oyeFFvUkFKREM3Ri8vTGt2MTdiOGdpWVVxLzJyZEh5Y25YbmpvRlJFQ202WkpOQS9maU5hNC8rOTdyYzA2bkxVUnFKV1pRS0NZUGRmZWFXaEhnQU1ZOGt5amdaZUJHU21RNWJnYXlQa2wxNjNMM3cvTDhrZWEydHRWaDVaQXEzOCtXbHd1ckYzTGwzUjZRakl5d0U1WWhUZTFzSVRWZHBDSVNsUXdJU3EvYy9CR0tNemVUSVJIZUNvZmRvOGEvK0hBVEFrTlVqTHdBMEFLMGlJck1rZUF2UXhRWGN5NURYOTc5ZlhIdGpVVVVlRklqTy8zd243eXhkdWY5MGJRc1dVQ1dCWWpHT2hpZHZ6N0k4eStaaGtzZkpBZFkyZ05YNzkyUE1oc01GQWlBcjVCSjMxN2ZrOEV3TVQyUGhPdjFHYW9iUTZiUWw2RkpFTG5QUDZNdGZOSDdudnc3eUZrd0hyYkQzeVdldFgvLzI4UXRldi9lQndSa2k0QS9yM3lWR1RqREdTQ0wzM0dDUWpuUWVBR1haYURTS1lweDdMT25GZVBXcVF6VGs4MHRQRDhjbWdnK0FWaXMvUEN6eVBKdWNWbDRNbDlubmRYaXcrOU8vZ2RzNFZLR3NobnVENVdNbmt6WFhkSHF0eWl3NzhDcFBlaXdraW1LbjB6N2NMN0lpVy9qNGcrTjMvZnBmL2dEQXcvZmZ4eWg0TWNwcEFqdC8rTTdveTE4cy9ja2ZQMjM4Nk1QelpWcWVoY3VRTHgvM1FzREM4c0tUNGVGQlZYenJoNmZrRjJBcWt1dDN0eUJQU1ZKWkZrYUh4ZHpDN0xTa3djWXRIOGZZYXVSdUlQSk1Cei8vcFAzYnRUTC85ZHFhNUVUQUtUdDZDVnlHdkJrYWpVWlJGSXZ6YzBzL2VFYUs1d1FpWVNFaXNxemkwa2N6N3ZySHRiVm15QXF2R3BaeFdDRkFYc1FZTU9nZG5YbTN2L2ppNE0wM0xXL2pXSmJFcFhFWjhvdmJNNGI2Zkt6YzM5NjdlUk5BQ0ZyNWFMYnExZ3FOVVN5YWpkemxKRHZGd1RCa2hjZk96b2xKOVBxREIvM3VMWGMwdi83blMzVCtPSDRwWXNaTUxKM0IrVGc2elFXNGh6TFF5cEhsODdGY09KbUhOLy9GRjN2Ly9mY0tLNi90N0J6KzVpVlBxWTd3YjBmK21XaGxqV1FRM2R3OG4zc3c0MlVSK09xTnEvT2ZmYmIvMWxzTHgxS0xMb2VYaVB6SzNlY3lIOTlnNXVzckFmUEZjT1M5bnM3c2ZjbnhEWkFmV2Q3eWNqODBlOTB0OGtTeTFiOGxldDB1WUNrTExpV3FMRS9ucDB6and1VDczVTBCS1ZZemszdW9GSGREZTVMbjc3czNibnlEV3ZWRmtFU1BIQUtOZmlxdDZqUXVURjZJUkpBWVFzb2lRc1hBU2FGRENJcnhtQmQrKy9ib3NIQlhXVlkwVzM0K2szWUo3RjMvbzRneG1Edy9xNkpPaDlLbmNXSHlGTVdTYU1pRElBRkdTaFRjYUdVWnpJNmRtdzZIcmZuNTNmNCtRM0I1ZjJQclZLclVCVERvYmpWYk9ZRFdYS08zdTVzU0FWT2FRRlFSMUl3Y1VjdzhGQ3lmcDhHTHIzbkNQUGNBQWM0c1UrV3BzQXR3eVFqM29MVzFrZVZPamlKYUR4OHFiNnRPdTdqdzA2WXdIcFhMSy9OUG5oeFNRWXhCbVNObEhhdkNPRDFoYktXQnp5TnZYb3o4M3RyM1hCR1owcHdLcW56eTdra0R0SEwvRGdDOStXYnJ6VGQzczNsNHJKaEpCZG1Bdi9BeGd3aFR2ejlNMDQzS0JDRGxaVTZTeFFpYW1keWZwd1RzWXVUZDNHS29yQ0tSRzZNb3dlVU56eU5UYXZJRUR4NWdmVXV3TW0rc1BQNlh3ZXExT0hsTkFIcmQ5K3F3akhYV3dmTXNCd29zZy9LWTBvT2ljS1VhUGduTnlHQVdZelNDeTcydmhndWRzalgzUEM3VEJjajN1bHVTWWg0aGRqS05hUFB6Yy8zQlBvblNxdHl6aFoxSmNQN0ZGL3UvL3dkS1ZSOG5rZ29BNE9INzcydnNqSVI1T255RDFGL2ZTcnRGZlJpanRFcHF1VmFLa2tjdnpmS1VJeUdwcVhoZytXSWM3N05aeFF6QWlLVXRMQzN1RC9obkh6OFBvK2NsUDFpLzZYVk92UmpDNGFPSDFtZ01TcVh4QUhWY2xpRFFYMW1WQ0VkemZFTEYrbXBqQTBYcHpUd2JWaDVCU3dsVWRqUnJPRG1JcXo5REpNaXNMSWNJK2VySDArZDhoKzkyRjZyeElBOEFHckNEWnI3MForZVVPcDFZZDZmY1c4NzQzYVB1clNnYUJZQXlSUGR4MmZ6Slg5VEpVejR0SWZYZjNaSmdGQ2dlcTJ3aDFZQkZqK0d3UkZDT21Bb0dVQ2VSQ3BMa2RTSisya3RTNGE2VU4yYlVNUDNqMnRxaE1Nam1KSVhnQnM3dy9JbGFJdWEwRFp3bXFpT0I3QmdkNVJRc29xNVJKS1ZHbGc1YjZneituWk1EWXFEWCtXQ21FeGxEZVdEVE04RTZ4V0dPbUVxM0pFVnh6TXJoT0oxOFhIZE1JVXluVnJVczMxVWxVYUpYWmpiYm9OYnlPSWlUVm5CNjJwc1lOYW0wVVB4NmJTM2xQYW9kbXFWWEVVMUlVSFZsQlM0UjBUMWpPTjdDMTJ0cnJtaFpnRU5DaU1mSWsxVUpBTEVjUG1GWWpOWGN4L2Q3M1UyQlFqUlpTWC9qM3ZNR2JmMk56VEo2SjUrWHZLbThraTk5TkcwMUJUenBQYTVXcnBBZ0REZ3hFcWZYUEpzSWhVb1NNWTR0WlREbWxzVlltYlUvK1RubkYvSnYvZHFnSUl4N3hVRXpaRmZ2bjNCbUxlUXhqc2wyUGFwV1Q2NUF5VVd5S0EvSU1GSmNldkFBd09yOUMrdENBQWJybXhMeVlISW5XQ0ZtQ0tjdkc3MzE5dUxQL3JyWDNTSmdWa29uWnZyMHRNOWdGYXRVUDVEbDdSelMydHJySDN5d2N1Zk9ZRGc4YUxYemYvajczUW9NUVBCMjFoakhFd21PL2U0bVlYbWpiYVNjSklxc3ZYdmxLcExZVGk1MzV1ZGFiU2xldld3SUtPRHdPMitIWG84QUhHWk1vdkNVRUp3UTV4ZDJOMjRaSWNqZHlCTWUvelQ1aFk4L3lGU2ZOeGkwNUZWS1gzMjh1ZG5PR29QWFZnY2JXd0lpWFVJanM2bHlUd0ZHdzZUQXJMT3pYVFphS3BvT0VXd09ueHlPaW9YRitVc3o3M1Z2N3YvdTc3VSsvNlJhdlpKY2EwazB6a3laMjExL3I3ejJhNUpqc25GTVJWd3p0cm9nbjQvRmJ0WVdPY2pibVdMdnhxYUVMQThkdGlGSWdRNlpyMzUwS25vVDNKZ1JEcS9uV014aUtDckdhL2QyUnQ5NWUrNm5mM0U1Mmtjb3I3M1J2N1k1U2N3UnljNHNCMG0zYncrSFk1U0ljRWl5NDBWQk5XWW9PUzJ2aHFIaDlHVE1ZNm9rSXhncHFGTWVORlJDNGNvWmNXdUljcGNScS9kL0JHRGx3WjlXb1VxcVcrdnpGMVhkQUlBMFE2YzZiSGpFR2E2aGJ0OHVpbXArdmxuQmlWUUFIOFRwS0hlMkE5eGJ2NW4xZTc1NlJXS3Fvb2JjRlJ1Q0NYTmVuU1hhRE42dGowbzdQNzZNR1hzbWV1dWJCSEtQQWQ2S3M3dXhkLzJQUWtQdGhYelFHOElnTWJhRGxYNWxlOXJoUGRQN24xay92eHNhNVV0Y1B6KzRkVXVWNEF6ZWlCaW4raythUmFNMzdQVVBwaTNpZVpVOTViVTM4bi81YXREZFF1MGd3WUhDcWt6QlRwVnAvYnNqbVdqTDZXTkhYZVVvQXdXUTdPek15SDg3ajRKK2hiNHpBd0FvZXUwdnAvOUh5VUN5YzRhc2VKNTBUV0R1ODArcTFaWGNmYVU2cUFzQ2xJcG1WSmU4dlVRL0lnZ20xY0NRQ3M0Y1p6SEhjNTVwL3dwOFR3NEFFd1Vyc3hoY0pzSlc3cjN3OStRY3g4djZEVW1vd3hZblJib3RQVGl2MnVFVlh1RVYvcFBpWHdGWWluWEgweE9oK0FBQUFBQkpSVTVFcmtKZ2dnPT0iIGhlaWdodD0iODciIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIG1lZXQiLz48L2c+PC9nPjwvZz48L3N2Zz4=';
var SENDER_EMAIL = 'info' + '@' + 'palettegroup.co.jp';
var SENDER = {
  name: '株式会社パレットグループ',
  addr1: '東京都千代田区神田鍛冶町3丁目3番地1',
  addr2: '神田ノースフロント 8F',
  tel: 'TEL：03-4405-4584',
  invoice: 'インボイス登録番号：T8011001119787',
  bank: 'GMOあおぞらネット銀行(0310)',
  branch: '法人第二営業部支店(102)',
  account: '普通：1673852　カ）アリイ',
  bankNote: '※社名変更前の口座名義となります。',
  biko: '恐れ入りますが、振込手数料は貴社にてご負担いただきますようお願い申し上げます。'
};

var docType = 'invoice';
var clientSuffix = '御中';

function setSuffix(s) {
  clientSuffix = s;
  document.getElementById('suffix-keichuu').style.background = s === '御中' ? '#333' : '#fff';
  document.getElementById('suffix-keichuu').style.color = s === '御中' ? '#fff' : '#333';
  document.getElementById('suffix-sama').style.background = s === '様' ? '#333' : '#fff';
  document.getElementById('suffix-sama').style.color = s === '様' ? '#fff' : '#333';
}

function getClientName() {
  var name = v('client-name');
  return name ? name + '　' + clientSuffix : '（宛先未入力）';
}
var rows = [];
var rowId = 0;

window.onload = function() {
  document.getElementById('stamp-sidebar').src = STAMP_URL;
  document.getElementById('s-email').textContent = SENDER_EMAIL;
  var today = new Date();
  document.getElementById('issue-date').value = fmt(today);
  var due = new Date(today);
  due.setDate(due.getDate() + 7);
  document.getElementById('due-date').value = fmt(due);
  addRow(); addRow(); addRow();
};

function fmt(d) { return d.toISOString().slice(0, 10); }

function fmtJp(s, withDay) {
  if (!s) return '—';
  var d = new Date(s);
  var days = ['日','月','火','水','木','金','土'];
  var base = d.getFullYear() + '年' + (d.getMonth()+1) + '月' + d.getDate() + '日';
  return withDay ? base + '(' + days[d.getDay()] + ')' : base;
}

function v(id) { return document.getElementById(id).value.trim(); }
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function setDocType(t) {
  docType = t;
  document.getElementById('btn-estimate').classList.toggle('active', t === 'estimate');
  document.getElementById('btn-invoice').classList.toggle('active', t === 'invoice');
  document.getElementById('limit-label').textContent = t === 'estimate' ? '有効期限' : '支払期限';
  document.getElementById('date-label').textContent = t === 'estimate' ? '発行日' : '請求日';
  document.getElementById('num-label').textContent = t === 'estimate' ? '見積No.' : '請求No.';
}

function addRow() {
  var id = ++rowId;
  rows.push({ id: id, name: '', qty: 1, unit: '個', price: 0 });
  renderRows();
}
function deleteRow(id) {
  if (rows.length <= 1) return;
  rows = rows.filter(function(r) { return r.id !== id; });
  renderRows();
}
function updateRow(id, field, val) {
  var r = rows.find(function(r) { return r.id === id; });
  if (r) { r[field] = val; renderRows(); }
}
function renderRows() {
  var tbody = document.getElementById('items-body');
  tbody.innerHTML = '';
  var units = ['個','式','本','枚','点','台','時間','日','月','ヶ月'];
  rows.forEach(function(row) {
    var sub = (row.qty||0) * (row.price||0);
    var tr = document.createElement('tr');
    var opts = units.map(function(u) { return '<option' + (u===row.unit?' selected':'') + '>' + u + '</option>'; }).join('');
    tr.innerHTML =
      '<td class="td-name"><input type="text" placeholder="品目・内容" value="' + esc(row.name) + '" onchange="updateRow(' + row.id + ',\'name\',this.value)"></td>'
      + '<td class="td-qty"><input type="number" min="0" step="1" value="' + row.qty + '" onchange="updateRow(' + row.id + ',\'qty\',+this.value)" style="text-align:right"></td>'
      + '<td class="td-unit"><select onchange="updateRow(' + row.id + ',\'unit\',this.value)">' + opts + '</select></td>'
      + '<td class="td-price"><input type="number" min="0" step="1" value="' + row.price + '" onchange="updateRow(' + row.id + ',\'price\',+this.value)" style="text-align:right"></td>'
      + '<td class="td-sub r">¥' + sub.toLocaleString() + '</td>'
      + '<td class="td-del"><button class="btn-del" onclick="deleteRow(' + row.id + ')">×</button></td>';
    tbody.appendChild(tr);
  });
  recalc();
}

function getTaxRate() { return parseFloat(document.querySelector('input[name="tax"]:checked').value); }
function calcTotals() {
  var sub = rows.reduce(function(s,r) { return s + (r.qty||0)*(r.price||0); }, 0);
  var rate = getTaxRate();
  var tax = Math.floor(sub * rate);
  return { sub: sub, rate: rate, tax: tax, total: sub + tax };
}
function recalc() {
  var t = calcTotals();
  document.getElementById('subtotal-display').textContent = '¥' + t.sub.toLocaleString();
  document.getElementById('tax-display').textContent = '¥' + t.tax.toLocaleString();
  document.getElementById('total-display').textContent = '¥' + t.total.toLocaleString();
  var pct = t.rate === 0 ? '非課税' : (t.rate*100).toFixed(0) + '%';
  document.getElementById('tax-label-disp').textContent = '消費税（' + pct + '）';
}

function buildAmountBar(total, validVal, forPrint) {
  if (forPrint) {
    return '<div style="display:flex;align-items:stretch;margin-bottom:12pt;border:1.5pt solid #333;">'
      + '<div style="background:#333;color:#fff;padding:6pt 14pt;display:flex;align-items:center;">'
      + '<span style="font-size:10pt;font-weight:700;letter-spacing:0.05em;">合計金額</span></div>'
      + '<div style="flex:1;padding:6pt 12pt;display:flex;align-items:center;gap:8pt;border-right:1.5pt solid #333;">'
      + '<span style="font-size:18pt;font-weight:700;color:#222;">¥' + total.toLocaleString() + '</span>'
      + '<span style="font-size:8pt;color:#555;">（税込）</span></div>'
      + '<div style="padding:6pt 16pt;display:flex;flex-direction:column;justify-content:center;">'
      + '<span style="font-size:10pt;font-weight:700;color:#555;">支払い期限：</span>'
      + '<span style="font-size:12pt;font-weight:700;color:#222;white-space:nowrap;">' + validVal + '</span>'
      + '</div></div>';
  }
  return '<div style="display:flex;align-items:stretch;margin-bottom:16px;border:1.5px solid #333;">'
    + '<div style="background:#333;color:#fff;padding:10px 16px;display:flex;align-items:center;">'
    + '<span style="font-size:12px;font-weight:700;letter-spacing:0.05em;">合計金額</span></div>'
    + '<div style="flex:1;padding:10px 16px;display:flex;align-items:center;gap:8px;border-right:1.5px solid #333;">'
    + '<span style="font-size:22px;font-weight:700;color:#222;">¥' + total.toLocaleString() + '</span>'
    + '<span style="font-size:11px;color:#555;">（税込）</span></div>'
    + '<div style="padding:10px 20px;display:flex;flex-direction:column;justify-content:center;">'
    + '<span style="font-size:13px;font-weight:700;color:#555;">支払い期限：</span>'
    + '<span style="font-size:14px;font-weight:700;color:#222;white-space:nowrap;">' + validVal + '</span>'
    + '</div></div>';
}

function buildPreviewHTML(forPrint) {
  var t = calcTotals();
  var pct = t.rate === 0 ? '非課税' : (t.rate*100).toFixed(0) + '%';
  var isEst = docType === 'estimate';
  var titleText = isEst ? '見　積　書' : '請　求　書';
  var numLabel = isEst ? '見積No.' : '請求No.';
  var dateLabel = isEst ? '発行日' : '請求日';
  var bodyText = isEst ? '下記の通り、お見積り申し上げます。' : '下記の通り、ご請求申し上げます。';
  var validVal = isEst ? '発行から1ヶ月' : fmtJp(v('due-date'), true);
  var validItems = rows.filter(function(r) { return r.name || r.price; });
  var itemRows = validItems.map(function(r, i) {
    return '<tr>'
      + '<td style="text-align:center">' + (i+1) + '</td>'
      + '<td>' + esc(r.name||'') + '</td>'
      + '<td style="text-align:center">' + r.qty + '</td>'
      + '<td style="text-align:center">' + r.unit + '</td>'
      + '<td style="text-align:right">¥' + (r.price||0).toLocaleString() + '</td>'
      + '<td style="text-align:right">¥' + ((r.qty||0)*(r.price||0)).toLocaleString() + '</td></tr>';
  }).join('');
  var emptyRows = '';
  if (forPrint) {
    for (var i = validItems.length; i < 8; i++) {
      emptyRows += '<tr><td style="height:22px"></td><td></td><td></td><td></td><td></td><td></td></tr>';
    }
  }
  var noteText = v('notes') ? SENDER.biko + '\n' + v('notes') : SENDER.biko;
  var amountBar = buildAmountBar(t.total, validVal, forPrint);
  var email = SENDER_EMAIL;

  if (forPrint) {
    return '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title></title>'
      + '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">'
      + '<style>@page{size:A4;margin:0;}body{margin:14mm;}*{box-sizing:border-box;margin:0;padding:0;}body{font-family:"Noto Sans JP",sans-serif;font-size:10pt;color:#222;}'
      + '.title{text-align:center;font-size:20pt;font-weight:700;letter-spacing:0.5em;margin-bottom:16pt;padding-bottom:8pt;border-bottom:2pt solid #333;}'
      + '.meta{display:grid;grid-template-columns:1fr 1fr;gap:14pt;margin-bottom:12pt;overflow:hidden;}'
      + '.to-name{font-size:13pt;font-weight:700;}.to-sub{font-size:8.5pt;color:#555;margin-top:3pt;}.subject{font-size:11.5pt;font-weight:500;margin-top:6pt;}'
      + '.from{font-size:8.5pt;color:#444;line-height:1.8;text-align:left;position:relative;padding-left:25%;}'
      + '.from strong{font-size:10.5pt;color:#222;}'
      + '.nos{font-size:8.5pt;color:#444;margin-bottom:12pt;}'
      + 'table.items{width:100%;border-collapse:collapse;margin-bottom:10pt;font-size:9pt;}'
      + 'table.items thead th{border-top:2pt solid #333;border-bottom:1pt solid #333;padding:5pt 7pt;font-size:8.5pt;font-weight:700;background:#f5f5f5;}'
      + 'table.items tbody td{padding:5.5pt 7pt;border-bottom:0.5pt solid #e0e0e0;}'
      + 'table.items tbody tr:last-child td{border-bottom:1.5pt solid #333;}'
      + '.subtotals{display:flex;justify-content:flex-end;margin-bottom:12pt;}'
      + '.subtotals table{min-width:160pt;border-collapse:collapse;}'
      + '.subtotals td{padding:3.5pt 8pt;font-size:9pt;}.subtotals td:last-child{text-align:right;font-weight:500;}'
      + '.subtotals tr.total td{font-size:11pt;font-weight:700;border-top:2pt solid #333;padding-top:5pt;}'
      + '.bank{font-size:9.5pt;color:#333;line-height:2.0;margin-bottom:10pt;}.bank strong{color:#222;}'
      + '.biko{border:0.5pt solid #ccc;padding:7pt 10pt;font-size:8.5pt;line-height:1.8;}.biko-lbl{font-weight:700;margin-bottom:3pt;}'
      + '</style></head><body>'
      + '<div class="title">' + titleText + '</div>'
      + '<div class="meta"><div>'
      + '<div class="to-name">' + esc(getClientName()) + '</div>'
      + '<div class="to-sub">' + bodyText + '</div>'
      + '<div class="subject">件名：' + esc(v('subject')||'—') + '</div>'
      + '</div><div class="from">'
      + '<strong>' + SENDER.name + '</strong><br>'
      + SENDER.addr1 + '<br>' + SENDER.addr2 + '<br>'
      + SENDER.tel + '<br>E-Mail：' + email + '<br>' + SENDER.invoice
      + '<img src="' + STAMP_URL + '" style="position:absolute;top:0;right:0;width:66pt;height:66pt;">'
      + '</div></div>'
      + '<div class="nos">' + numLabel + '　' + esc(v('doc-number')||'—') + '　／　' + dateLabel + '　' + fmtJp(v('issue-date')) + '</div>'
      + amountBar
      + '<table class="items"><thead><tr>'
      + '<th style="width:5%;text-align:center">No.</th><th style="width:40%">摘要</th>'
      + '<th style="width:8%;text-align:center">数量</th><th style="width:7%;text-align:center">単位</th>'
      + '<th style="width:13%;text-align:right">単価</th><th style="width:13%;text-align:right">金額</th>'
      + '</tr></thead><tbody>' + itemRows + emptyRows + '</tbody></table>'
      + '<div class="subtotals"><table>'
      + '<tr><td>小計</td><td>¥' + t.sub.toLocaleString() + '</td></tr>'
      + '<tr><td>消費税（' + pct + '）</td><td>¥' + t.tax.toLocaleString() + '</td></tr>'
      + '<tr class="total"><td>合計</td><td>¥' + t.total.toLocaleString() + '</td></tr>'
      + '</table></div>'
      + '<div class="bank"><strong>お振込先</strong>　' + SENDER.bank + '　' + SENDER.branch + '　' + SENDER.account + '<br>' + SENDER.bankNote + '</div>'
      + '<div class="biko"><div class="biko-lbl">備考</div>' + noteText.replace(/\n/g,'<br>') + '</div>'
      + '</body></html>';
  }

  return '<div class="pv-title">' + titleText + '</div>'
    + '<div class="pv-meta"><div>'
    + '<div class="pv-to-name">' + esc(getClientName()) + '</div>'
    + '<div class="pv-to-sub">' + bodyText + '</div>'
    + '<div class="pv-subject">件名：' + esc(v('subject')||'—') + '</div>'
    + '</div><div class="pv-from">'
    + '<strong>' + SENDER.name + '</strong><br>'
    + SENDER.addr1 + '<br>' + SENDER.addr2 + '<br>'
    + SENDER.tel + '<br>E-Mail：' + email + '<br>' + SENDER.invoice
    + '<img src="' + STAMP_URL + '" style="position:absolute;top:0;right:-4px;width:68px;height:68px;">'
    + '</div></div>'
    + '<div class="pv-nos">' + numLabel + '　' + esc(v('doc-number')||'—') + '　／　' + dateLabel + '　' + fmtJp(v('issue-date')) + '</div>'
    + amountBar
    + '<table class="pv-table"><thead><tr>'
    + '<th style="width:5%;text-align:center">No.</th><th style="width:40%">摘要</th>'
    + '<th class="r" style="width:8%">数量</th><th style="width:7%">単位</th>'
    + '<th class="r" style="width:13%">単価</th><th class="r" style="width:13%">金額</th>'
    + '</tr></thead><tbody>' + itemRows + '</tbody></table>'
    + '<div class="pv-subs"><table>'
    + '<tr><td>小計</td><td>¥' + t.sub.toLocaleString() + '</td></tr>'
    + '<tr><td>消費税（' + pct + '）</td><td>¥' + t.tax.toLocaleString() + '</td></tr>'
    + '<tr class="total"><td>合計</td><td>¥' + t.total.toLocaleString() + '</td></tr>'
    + '</table></div>'
    + '<div class="pv-bank"><strong>お振込先</strong>　' + SENDER.bank + '　' + SENDER.branch + '　' + SENDER.account + '<br>' + SENDER.bankNote + '</div>'
    + '<div class="pv-biko"><div class="pv-biko-lbl">備考</div>' + noteText.replace(/\n/g,'<br>') + '</div>';
}

function previewDoc() {
  var isEst = docType === 'estimate';
  document.getElementById('modal-title').textContent = (isEst ? '見積書' : '請求書') + ' プレビュー';
  document.getElementById('preview-content').innerHTML = buildPreviewHTML(false);
  document.getElementById('preview-modal').style.display = 'block';
}
function closeModal() { document.getElementById('preview-modal').style.display = 'none'; }

function downloadPdf() {
  var printContent = buildPreviewHTML(true);
  var existing = document.getElementById('print-iframe');
  if (existing) existing.remove();
  var iframe = document.createElement('iframe');
  iframe.id = 'print-iframe';
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;';
  document.body.appendChild(iframe);
  var doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open(); doc.write(printContent); doc.close();
  iframe.onload = function() {
    setTimeout(function() { iframe.contentWindow.focus(); iframe.contentWindow.print(); }, 800);
  };
  closeModal();
  showToast('印刷ダイアログを開きました。「PDFに保存」を選んでください。');
}

function resetForm() {
  if (!confirm('入力内容をリセットしますか？')) return;
  ['doc-number','client-name','subject','notes'].forEach(function(id) { document.getElementById(id).value = ''; });
  var today = new Date();
  document.getElementById('issue-date').value = fmt(today);
  var due = new Date(today); due.setDate(due.getDate() + 7);
  document.getElementById('due-date').value = fmt(due);
  rows = []; rowId = 0;
  addRow(); addRow(); addRow();
  showToast('リセットしました');
}

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3500);
}
